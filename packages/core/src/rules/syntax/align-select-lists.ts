// Ported from com/sap/adt/abapcleaner/rules/alignment/AlignSelectListsRule.java @ v1.29.0.
//
// Bounded subset: upstream classifies each SELECT-list field as "simple" (exactly one token, e.g. a
// bare column or `t1~col`) or "complex" (more than one token — a function call, expression, or a
// trailing `AS alias`/`ASCENDING`/`DESCENDING` addition — OR a single tilde-qualified token, since
// `ConsiderTildeAsComplex` defaults to true), then OR-reduces that signal across the WHOLE clause: if
// ANY field is complex, the entire list gets forced multi-line (one field per line). This port
// narrows that to an AND-reduction — every field must be complex — which is a strictly conservative
// subset of when upstream's real default would also choose multi-line (every-field-complex implies
// at-least-one-field-complex), never a case upstream's default would leave alone. A field
// classification uses the exact same signal upstream does (more than one token, OR one token
// containing `~`); this port's tokenizer never splits `t1~col` or a host variable `@lv_x` into
// multiple tokens (`~`/`@` aren't stop characters), so the token-count/substring checks reproduce
// upstream's real classification exactly for every field shape checked against the Java source
// (tilde-qualified, `AS`-qualified, string/numeric literal, host variable, `*`).
//
// Recognized shape: a `Command` matching `select-refusals.ts`'s shared `parseSimpleSelectCode` gate
// (same "simple, single-query, non-loop, already-multi-line SELECT" refusal vocabulary as
// `ALIGN_SELECT_CLAUSES`). Within it, the SELECT-list span (after skipping a leading `SINGLE`/
// `DISTINCT`, up to the first top-level `FROM`) is split into fields by top-level (bracket-depth 0)
// commas — a function call's own internal commas (`SUM( a, b )`) don't split it, since depth is
// tracked; a `CASE ... WHEN ... THEN ... END` field has no top-level comma or bracket of its own
// either, so it can't misfire the split. A whitespace-separated field list (no comma at all, e.g.
// `SELECT SINGLE t1~a t2~b`) collapses to exactly one field under this split and is refused via the
// "fewer than 2 fields" rule below, matching this port's general "refuse rather than guess" pattern
// for a real but unhandled OpenSQL shape. Refuses if any field is empty (a stray comma) or there are
// fewer than 2 fields (nothing to reposition against a single field, and a bare `SELECT *` — a
// single punctuation token — always falls into this case too). Refuses the whole list if any field
// is "simple" by the classification above.
//
// Transform: for a list where every field is complex, forces every field after the first onto its
// own line, hang-indented to the column of the FIRST field's own first token — the exact technique
// `align-clear-free.ts` already uses for `CLEAR:`/`FREE:` chains, and confirmed to match upstream's
// own indent computation for this rule (`start.getPrevCodeToken().getEndIndexInLine() + 1`, i.e.
// "wherever the first field already sits" — a different, unrelated indent target from
// `ALIGN_SELECT_CLAUSES`'s `SELECT`-column-plus-2 convention, which governs clause keywords, not
// fields). Additionally, since `align-helpers.ts` gained `alignColumnsWithOptionalCells` (Term cells
// + sparse TRAILING columns), each field is also split into a `[NAME, ADDITIONS]` pair — `ADDITIONS`
// being the field's own trailing `AS <alias>` (found via a depth-tracked scan for a top-level `AS`,
// so a nested `AS` inside e.g. `CAST( x AS abap.int4 )` is never mistaken for the field's own alias
// marker) if present, `undefined` otherwise — and left-pads the `NAME` column so every field's `AS`
// lines up, matching upstream's real default (`AlignAsInSelectList = true`). A field with no `AS` at
// all gets no padding of its own (nothing to align it before) but its `NAME` width still counts
// toward the shared column-0 width, exactly matching upstream's own column model (column 0 is never
// sparse, so its width is drawn from every field regardless of whether that field has `ADDITIONS`).
// `ASCENDING`/`DESCENDING` additions (relevant to `ORDER BY`, not this `SELECT`-list-only rule) are
// not recognized as a split point — only `AS`.
import { parseAbapCommands, type Command } from '../../parser/commands.js';
import type { Token } from '../../parser/tokenizer.js';
import { applyEdits, breakBeforeWithIndent, type Edit } from '../ddl/position-helpers.js';
import { alignColumnsWithOptionalCells, type AlignSpan } from './align-helpers.js';
import { parseSimpleSelectCode } from './select-refusals.js';

const LIST_PREFIX_KEYWORDS = new Set(['SINGLE', 'DISTINCT']);

export function alignSelectLists(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const edits: Edit[] = [];
  for (const command of commands) edits.push(...processSelectCommand(sourceText, command));
  return applyEdits(sourceText, edits);
}

function processSelectCommand(sourceText: string, command: Command): readonly Edit[] {
  const code = parseSimpleSelectCode(command);
  if (code === undefined) return [];

  const fields = parseSelectListFields(code);
  if (fields === undefined || fields.length < 2) return [];
  if (fields.some((field) => !isComplexField(field))) return [];

  const indent = columnOf(sourceText, fields[0]![0]!.offset);
  const edits: Edit[] = [];
  for (const field of fields.slice(1)) {
    const index = command.tokens.indexOf(field[0]!);
    edits.push(...breakBeforeWithIndent(command.tokens, index, indent));
  }

  const rows = fields.map((field) => splitFieldForAlignment(field));
  edits.push(...alignColumnsWithOptionalCells(rows));

  return edits;
}

function splitFieldForAlignment(field: readonly Token[]): readonly [AlignSpan, AlignSpan | undefined] {
  let depth = 0;
  for (let index = 1; index < field.length; index += 1) {
    const token = field[index]!;
    if (token.kind === 'punctuation' && '([{'.includes(token.text)) depth += 1;
    else if (token.kind === 'punctuation' && ')]}'.includes(token.text)) depth -= 1;
    if (depth === 0 && token.kind === 'word' && token.text.toUpperCase() === 'AS') {
      return [{ first: field[0]!, last: field[index - 1]! }, { first: token, last: field[field.length - 1]! }];
    }
  }
  return [{ first: field[0]!, last: field[field.length - 1]! }, undefined];
}

function parseSelectListFields(code: readonly Token[]): (readonly Token[])[] | undefined {
  let listStart = 1;
  while (code[listStart]?.kind === 'word' && LIST_PREFIX_KEYWORDS.has(code[listStart]!.text.toUpperCase())) {
    listStart += 1;
  }

  const fromIndex = findTopLevelFromIndex(code, listStart);
  if (fromIndex === undefined) return undefined;

  const listTokens = code.slice(listStart, fromIndex);
  if (listTokens.length === 0) return undefined;

  const fields: Token[][] = [[]];
  let depth = 0;
  for (const token of listTokens) {
    if (token.kind === 'punctuation' && '([{'.includes(token.text)) depth += 1;
    else if (token.kind === 'punctuation' && ')]}'.includes(token.text)) depth -= 1;
    if (depth === 0 && token.kind === 'punctuation' && token.text === ',') {
      fields.push([]);
      continue;
    }
    fields.at(-1)!.push(token);
  }
  if (fields.some((field) => field.length === 0)) return undefined;
  return fields;
}

function findTopLevelFromIndex(code: readonly Token[], fromStart: number): number | undefined {
  let depth = 0;
  for (let index = fromStart; index < code.length; index += 1) {
    const token = code[index]!;
    if (token.kind === 'punctuation' && '([{'.includes(token.text)) {
      depth += 1;
      continue;
    }
    if (token.kind === 'punctuation' && ')]}'.includes(token.text)) {
      depth -= 1;
      continue;
    }
    if (depth === 0 && token.kind === 'word' && token.text.toUpperCase() === 'FROM') return index;
  }
  return undefined;
}

function isComplexField(field: readonly Token[]): boolean {
  if (field.length > 1) return true;
  return field[0]!.text.includes('~');
}

function columnOf(sourceText: string, offset: number): number {
  return offset - (sourceText.lastIndexOf('\n', offset - 1) + 1);
}
