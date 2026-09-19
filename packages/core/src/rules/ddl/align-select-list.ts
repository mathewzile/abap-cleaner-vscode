// Ported from com/sap/adt/abapcleaner/rules/ddl/alignment/DdlAlignSelectListRule.java @ v1.29.0.
//
// Bounded subset: upstream aligns the `{ key field1 as alias1, field2 as alias2, ... }` select-list
// block as a 3-column table (`KEY_OR_VIRTUAL`, `ELEMENT`, `AS_ALIAS`), plus real comment-integration
// machinery (textual comments and commented-out elements tracked and aligned alongside active code)
// this port has no equivalent for. This port folds `KEY`/`VIRTUAL` into the `ELEMENT` cell's own
// span (extending it backward to include a leading `KEY`/`VIRTUAL` keyword when present) rather than
// giving it a separate column — `KEY_OR_VIRTUAL` is ABSENT on most elements, making it a LEADING
// sparse column, which `align-helpers.ts`'s `alignColumnsWithOptionalCells` does not support (see
// that file's header); folding it into `ELEMENT` (always present, so it's column 0) sidesteps the
// problem entirely rather than approximating it. The comment-integration machinery is not attempted
// at all — a select list containing ANY comment token anywhere refuses the WHOLE list, a real (not
// merely convenient) narrowing given how substantial and specific to this rule that machinery is
// upstream. `ELEMENT` can be a `Term` (a bare dotted path is one token under this port's tokenizer,
// `.` isn't a stop character, but a calculated field like `concat_with_space( a.x, a.y )` is
// multi-token).
//
// Recognized shape: every top-level (bracket-depth 0 relative to the whole file) `{`...`}` pair (a
// CDS view's select-list block; multiple such pairs across a multi-view file are each processed
// independently). Within one pair, elements are split by top-level (relative to this `{`) commas — a
// function call's own internal commas don't split an element, since depth is tracked. Refuses the
// WHOLE list if any element is empty (a stray comma), contains a comment token, there are fewer than
// 2 elements, or any two elements' first tokens share a source line (matching this port's
// established "consecutive row" same-line-grouping-bug prevention — column alignment is inherently a
// vertical/cross-line concept). Each element's `AS_ALIAS` (`[AS, alias]`) is recognized only when the
// `AS` is at depth 0 relative to that element's own tokens (so `AS` inside a nested function call,
// e.g. a hypothetical cast, is never mistaken for the element's own alias) and sits on the SAME
// source line as the rest of the element (an alias already on its own separate line is left
// untouched rather than merged upward, for the same reason documented in `align-data-sources.ts`'s
// header).
//
// Transform: left-pads `ELEMENT` so every element's `AS_ALIAS` (when present) lines up in a shared
// column; an element with no alias is not padded itself, but its width still counts toward the
// shared column, reusing `alignColumnsWithOptionalCells` exactly as `align-data-sources.ts`/
// `align-select-lists.ts` (ABAP) do. Not implemented: forcing a one-element-per-line layout (this
// rule only aligns columns of an ALREADY one-per-line list, refusing otherwise — matching
// `DDL_ALIGN_DATA_SOURCES`'s and `DDL_ALIGN_FUNCTION_PARAMETERS`'s pattern, not
// `DDL_ALIGN_FIELD_LISTS`'s repositioning one), the DDIC-view name-list-adjacent layout concerns,
// and any comment-integration behavior.
import { tokenize, findMatchingBracket, type Token } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange, type OffsetRange } from './annotation-ranges.js';
import { applyEdits, type Edit } from './position-helpers.js';
import { alignColumnsWithOptionalCells, type AlignSpan } from '../syntax/align-helpers.js';

const PREFIX_KEYWORDS = new Set(['KEY', 'VIRTUAL']);

export function alignDdlSelectList(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const skipRanges = annotationRanges(sourceText, tokens);

  const edits: Edit[] = [];
  let depth = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.kind !== 'punctuation' || isInsideAnyRange(skipRanges, token.offset)) continue;
    if ('([{'.includes(token.text)) {
      if (token.text === '{' && depth === 0) {
        const closeIndex = findMatchingBracket(tokens, index);
        if (closeIndex !== undefined) {
          edits.push(...processSelectList(tokens, skipRanges, index, closeIndex));
        }
      }
      depth += 1;
      continue;
    }
    if (')]}'.includes(token.text)) depth -= 1;
  }

  return applyEdits(sourceText, edits);
}

function processSelectList(tokens: readonly Token[], skipRanges: readonly OffsetRange[], openIndex: number, closeIndex: number): readonly Edit[] {
  const fields = splitFields(tokens, skipRanges, openIndex, closeIndex);
  if (fields === undefined || fields.length < 2) return [];
  if (fields.some((field, index) => index > 0 && field[0]!.line === fields[index - 1]![0]!.line)) return [];
  if (fields.some((field) => field.some((token) => token.kind === 'comment'))) return [];

  const rows = fields.map((field) => buildRow(field));
  if (rows.some((row) => row === undefined)) return [];

  return alignColumnsWithOptionalCells(rows as (readonly (AlignSpan | undefined)[])[]);
}

function splitFields(
  tokens: readonly Token[],
  skipRanges: readonly OffsetRange[],
  openIndex: number,
  closeIndex: number,
): (readonly Token[])[] | undefined {
  const fields: Token[][] = [[]];
  let depth = 0;
  for (let index = openIndex + 1; index < closeIndex; index += 1) {
    const token = tokens[index]!;
    if (isInsideAnyRange(skipRanges, token.offset)) continue;
    if (token.kind === 'punctuation' && '([{'.includes(token.text)) depth += 1;
    else if (token.kind === 'punctuation' && ')]}'.includes(token.text)) depth -= 1;
    if (token.kind === 'whitespace') continue;
    if (depth === 0 && token.kind === 'punctuation' && token.text === ',') {
      fields.push([]);
      continue;
    }
    fields.at(-1)!.push(token);
  }
  if (fields.some((field) => field.length === 0)) return undefined;
  return fields;
}

function buildRow(field: readonly Token[]): readonly [AlignSpan, AlignSpan | undefined] | undefined {
  const code = field.filter((token) => token.kind !== 'comment');
  if (code.length === 0) return undefined;

  let elementStart = 0;
  if (code[0]!.kind === 'word' && PREFIX_KEYWORDS.has(code[0]!.text.toUpperCase()) && code.length > 1) {
    elementStart = 1;
  }

  let depth = 0;
  for (let index = elementStart + 1; index < code.length; index += 1) {
    const token = code[index]!;
    if (token.kind === 'punctuation' && '([{'.includes(token.text)) depth += 1;
    else if (token.kind === 'punctuation' && ')]}'.includes(token.text)) depth -= 1;
    if (depth === 0 && token.kind === 'word' && token.text.toUpperCase() === 'AS') {
      const aliasToken = code[index + 1];
      if (aliasToken === undefined || aliasToken.kind !== 'word') return undefined;
      const element: AlignSpan = { first: code[0]!, last: code[index - 1]! };
      if (token.line !== element.last.line) return [element, undefined];
      return [element, { first: token, last: aliasToken }];
    }
  }

  return [{ first: code[0]!, last: code[code.length - 1]! }, undefined];
}
