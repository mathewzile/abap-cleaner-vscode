// Ported from com/sap/adt/abapcleaner/rules/ddl/alignment/DdlAlignFunctionParametersRule.java,
// rulehelpers/RuleForDdlAlignParameters.java @ v1.29.0.
//
// Bounded subset: the same technique `DDL_ALIGN_SOURCE_PARAMETERS`/`DDL_ALIGN_ENTITY_PARAMETERS`
// already use, applied to a CDS built-in function call's named-parameter syntax
// (`currency_conversion( amount => a, source_currency => b )`) instead of a data source's or
// entity's `:`-separated parameters. Finds every `(` preceded by a word token (the function name —
// no hardcoded function-name whitelist, since this port has no CDS built-in function list; the
// signal used instead is the presence of a top-level `=>` token inside the parens, which never
// appears inside a `:`-separated parameter list, so the two rules' triggers never overlap) and, if
// EVERY parameter in it has the simple shape `<name> => <single-token-value>`, left-pads the
// name/`=>` columns to the widest cell in each, reusing the shared `alignColumnsLeftAligned` engine.
// Matching upstream's own "if one parameter Command is blocked, cancel alignment entirely" behavior
// for the two already-shipped sibling rules, a single parameter with a multi-token value (e.g.
// `a + b`) cancels alignment for the *whole* call rather than skipping just that parameter — this is
// a deliberately STRICTER, more conservative choice than upstream's own real behavior, which instead
// silently skips just the non-matching parameter and aligns whatever `name => value` pairs it does
// find; refusing the whole call trades a little alignment coverage for never guessing at a shape this
// port hasn't verified. Nested function calls are handled independently, since every `(` in the file
// is scanned and processed on its own — an inner call with only single-token values aligns even when
// its enclosing outer call has a nested-call (multi-token) value that makes the outer call refuse.
// Also requires every parameter row to sit on its own distinct source line, matching every other
// "consecutive row" alignment rule in this port. Not implemented: upstream's default (`ParameterPos
// = CONTINUE`) also collapses a line break before the opening `(` back onto the function-name line
// and pulls the first parameter onto that same line, and normalizes blank lines after the closing
// `)` — none of that line-break/positioning behavior is touched here, only existing lines' horizontal
// column padding (this port's `applyEdits`/`alignColumnsLeftAligned` never insert or remove a line
// break). A single-parameter call (nothing to align against) is left untouched.
import { tokenize, findMatchingBracket, type Token } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange, type OffsetRange } from './annotation-ranges.js';
import { applyEdits, prevCodeIndex, type Edit } from './position-helpers.js';
import { alignColumnsLeftAligned } from '../syntax/align-helpers.js';

export function alignDdlFunctionParameters(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const skipRanges = annotationRanges(sourceText, tokens);

  const edits: Edit[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.kind !== 'punctuation' || token.text !== '(' || isInsideAnyRange(skipRanges, token.offset)) continue;

    const prevIndex = prevCodeIndex(tokens, index);
    if (prevIndex === undefined || tokens[prevIndex]!.kind !== 'word') continue;

    const closeIndex = findMatchingBracket(tokens, index);
    if (closeIndex === undefined) continue;

    if (!containsTopLevelArrow(tokens, skipRanges, index, closeIndex)) continue;

    const rows = splitParameters(tokens, skipRanges, index, closeIndex);
    if (rows === undefined || rows.length < 2) continue;
    if (rows.some((row, rowIndex) => rowIndex > 0 && row[0]!.line === rows[rowIndex - 1]![0]!.line)) continue;

    edits.push(...alignColumnsLeftAligned(rows));
  }

  return applyEdits(sourceText, edits);
}

function containsTopLevelArrow(tokens: readonly Token[], skipRanges: readonly OffsetRange[], openIndex: number, closeIndex: number): boolean {
  let depth = 0;
  for (let index = openIndex + 1; index < closeIndex; index += 1) {
    const token = tokens[index]!;
    if (isInsideAnyRange(skipRanges, token.offset)) continue;
    if (token.kind === 'punctuation' && '([{'.includes(token.text)) depth += 1;
    else if (token.kind === 'punctuation' && ')]}'.includes(token.text)) depth -= 1;
    if (depth === 0 && token.kind === 'punctuation' && token.text === '=>') return true;
  }
  return false;
}

function splitParameters(
  tokens: readonly Token[],
  skipRanges: readonly OffsetRange[],
  openIndex: number,
  closeIndex: number,
): (readonly Token[])[] | undefined {
  const codeIndices: number[] = [];
  let depth = 0;
  for (let index = openIndex + 1; index < closeIndex; index += 1) {
    const token = tokens[index]!;
    if (isInsideAnyRange(skipRanges, token.offset)) continue;
    if (token.kind === 'punctuation' && '([{'.includes(token.text)) depth += 1;
    else if (token.kind === 'punctuation' && ')]}'.includes(token.text)) depth -= 1;
    if (token.kind === 'whitespace' || token.kind === 'comment') continue;
    if (token.kind === 'punctuation' && token.text === ',' && depth === 0) {
      codeIndices.push(-1); // segment separator marker
      continue;
    }
    codeIndices.push(index);
  }

  const segments: number[][] = [[]];
  for (const entry of codeIndices) {
    if (entry === -1) segments.push([]);
    else segments.at(-1)!.push(entry);
  }

  const rows: (readonly Token[])[] = [];
  for (const segment of segments) {
    if (segment.length === 0) continue;
    if (segment.length !== 3) return undefined; // name, =>, single-token value only
    const name = tokens[segment[0]!]!;
    const arrow = tokens[segment[1]!]!;
    const value = tokens[segment[2]!]!;
    if (name.kind !== 'word' || arrow.text !== '=>') return undefined;
    rows.push([name, arrow, value]);
  }

  return rows;
}
