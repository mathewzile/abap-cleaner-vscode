// Ported from com/sap/adt/abapcleaner/rules/ddl/alignment/DdlAlignFieldListsRule.java @ v1.29.0.
//
// Bounded subset: of upstream's two unrelated targets (a DDIC-view parenthesized name list, and a
// `GROUP BY` field list), only `GROUP BY` is handled — the name-list case has different, more
// involved position semantics (`DdlNameListPos` forces the opening `(` itself onto a fresh line
// before indenting the list) and narrower real-world applicability, and is left for a future pass.
//
// For `GROUP BY`, upstream's own per-field "simple vs. complex" classification
// (`hasMultiTokenField || hasDot`) is dead code under default config: `ComplexGroupByListLayout` and
// `SimpleGroupByListLayout` both default to `MULTI_LINE`, and `determineLayout()` has an early
// return whenever the two configs are equal — so upstream's real default unconditionally forces
// EVERY `GROUP BY` field list with 2+ fields onto one field per line, regardless of field complexity
// or whether the list was already single-line (an already-single-line list is NOT left alone here,
// unlike `ALIGN_SELECT_CLAUSES`'s `KEEP_EXISTING` — there is no equivalent one-liner guard for this
// rule's default). This port reproduces exactly that: no field classification is needed or
// attempted. What IS deliberately different from upstream's default (`GroupByListPos = CONTINUE`,
// which computes a fixed `byToken`-relative indent formula AND unconditionally pulls the first field
// itself onto the `GROUP BY` line, collapsing any existing break there) is left unimplemented — this
// port never touches the first field's existing position, and hang-indents subsequent fields to
// wherever the first field ALREADY sits (the same technique `align-clear-free.ts`/
// `align-select-lists.ts` use), which coincides with upstream's CONTINUE formula only when the first
// field already sits flush after `BY`. `GroupByListPos`'s own repositioning is simply not ported.
//
// Recognized shape: a top-level (bracket-depth 0, outside any annotation) `GROUP` word token
// immediately followed by `BY`. Bracket-depth 0 is used as a proxy for "not inside a subquery"
// (upstream's real mechanism is Command-tree based, `command.getParent() != null`, which this port's
// flat DDL token stream has no equivalent of) — a reasonable proxy since a CDS subquery's `GROUP BY`
// always sits inside the subquery's own parentheses. From the token after `BY`, code tokens are
// collected (tracking bracket depth, so a function call's own internal commas don't split fields)
// until hitting `HAVING`/`ORDER`/`UNION`/`INTERSECT`/`EXCEPT`/`;` at depth 0, or the end of the token
// stream — the `;` boundary matters because without it a GROUP BY at the end of one CDS artifact in
// a multi-artifact file would otherwise misparse the next artifact's unrelated leading tokens as more
// fields. (This port's tokenizer has no reserved-word concept, so a bare, undotted field literally
// named `having`/`order`/etc. would collide with this boundary scan — a real but narrow residual
// risk, matching every other DDL rule's keyword-vs-identifier ambiguity in this port.) The list is
// split into fields by top-level commas; refuses if any field is empty (a stray comma) or there are
// fewer than 2 fields (nothing to reposition against a single field).
//
// Transform: forces every field after the first onto its own line, hang-indented to the column of
// the FIRST field's own actual token offset in the source. Not implemented: the DDIC-view name-list
// case, comment re-indentation within the list, comma-spacing normalization.
import { tokenize, type Token } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange, type OffsetRange } from './annotation-ranges.js';
import { applyEdits, breakBeforeWithIndent, nextCodeIndex, type Edit } from './position-helpers.js';

const BOUNDARY_KEYWORDS = new Set(['HAVING', 'ORDER', 'UNION', 'INTERSECT', 'EXCEPT']);

export function alignDdlFieldLists(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const skipRanges = annotationRanges(sourceText, tokens);

  const edits: Edit[] = [];
  let depth = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.kind === 'punctuation' && '([{'.includes(token.text)) {
      depth += 1;
      continue;
    }
    if (token.kind === 'punctuation' && ')]}'.includes(token.text)) {
      depth -= 1;
      continue;
    }
    if (depth !== 0 || token.kind !== 'word' || isInsideAnyRange(skipRanges, token.offset)) continue;
    if (token.text.toUpperCase() !== 'GROUP') continue;
    const byIndex = nextCodeIndex(tokens, index);
    if (byIndex === undefined || tokens[byIndex]!.kind !== 'word' || tokens[byIndex]!.text.toUpperCase() !== 'BY') continue;

    const fields = collectFields(tokens, skipRanges, byIndex);
    if (fields === undefined || fields.length < 2) continue;

    const indent = columnOf(sourceText, fields[0]![0]!.offset);
    for (const field of fields.slice(1)) {
      const fieldIndex = tokens.indexOf(field[0]!);
      edits.push(...breakBeforeWithIndent(tokens, fieldIndex, indent));
    }
  }

  return applyEdits(sourceText, edits);
}

function collectFields(
  tokens: readonly Token[],
  skipRanges: readonly OffsetRange[],
  byIndex: number,
): (readonly Token[])[] | undefined {
  const fields: Token[][] = [[]];
  let depth = 0;
  for (let index = byIndex + 1; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (isInsideAnyRange(skipRanges, token.offset)) continue;
    if (token.kind === 'punctuation' && '([{'.includes(token.text)) depth += 1;
    else if (token.kind === 'punctuation' && ')]}'.includes(token.text)) depth -= 1;
    if (depth === 0 && token.kind === 'punctuation' && token.text === ';') break;
    if (depth === 0 && token.kind === 'word' && BOUNDARY_KEYWORDS.has(token.text.toUpperCase())) break;
    if (token.kind === 'whitespace' || token.kind === 'comment') continue;
    if (depth === 0 && token.kind === 'punctuation' && token.text === ',') {
      fields.push([]);
      continue;
    }
    fields.at(-1)!.push(token);
  }
  if (fields.some((field) => field.length === 0)) return undefined;
  return fields;
}

function columnOf(sourceText: string, offset: number): number {
  return offset - (sourceText.lastIndexOf('\n', offset - 1) + 1);
}
