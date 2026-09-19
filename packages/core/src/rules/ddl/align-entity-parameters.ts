// Ported from com/sap/adt/abapcleaner/rules/ddl/alignment/DdlAlignEntityParametersRule.java @ v1.29.0
//
// Bounded subset: the first `DDL_ALIGNMENT` rule ported, and the natural follow-up to
// `DDL_POSITION_DEFINE` (which already breaks/indents the `WITH PARAMETERS` keyword phrase but
// explicitly punts on the parameter list itself). Finds the top-level `WITH PARAMETERS` clause
// (there is normally only one per view) and, if EVERY parameter in it has the simple shape
// `<name> : <single-token-type>` (annotations directly above a parameter are skipped, not
// realigned), enforces indent 4 (`DdlPositionDefineRule`'s shared `ParamsIndent` default) before
// each parameter's name and left-pads the name/colon columns to the widest cell in each, reusing
// the shared `alignColumnsLeftAligned` engine. Matching upstream's own "if one of the parameter
// Commands is blocked, cancel alignment entirely" behavior, a single parameter with a multi-token
// type (e.g. `abap.char( 10 )`) — a `Term` cell the current bounded engine doesn't support — cancels
// alignment for the *whole* clause rather than just skipping that one parameter, since every
// parameter's column width depends on every other's. Type-column alignment
// (`AlignTypes`/`AlignColons` = true by default) is not distinguished from name/colon alignment;
// both are always applied together.
import { tokenize, type Token } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange } from './annotation-ranges.js';
import { applyEdits, breakBeforeWithIndent, nextCodeIndex, nextCodeWordIs, type Edit } from './position-helpers.js';
import { alignColumnsLeftAligned } from '../syntax/align-helpers.js';

const PARAMS_INDENT = 4;

export function alignDdlEntityParameters(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const skipRanges = annotationRanges(sourceText, tokens);

  const parametersIndex = findParametersIndex(tokens, skipRanges);
  if (parametersIndex === undefined) return sourceText;
  const endIndex = findAsIndex(tokens, skipRanges, parametersIndex);

  const rows = splitParameters(tokens, skipRanges, parametersIndex, endIndex);
  if (rows === undefined || rows.length === 0) return sourceText;

  const edits: Edit[] = [];
  for (const row of rows) edits.push(...breakBeforeWithIndent(tokens, tokens.indexOf(row[0]!), PARAMS_INDENT));
  edits.push(...alignColumnsLeftAligned(rows));

  return applyEdits(sourceText, edits);
}

function findParametersIndex(tokens: readonly Token[], skipRanges: ReturnType<typeof annotationRanges>): number | undefined {
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
    if (token.text.toUpperCase() === 'WITH' && nextCodeWordIs(tokens, index, 'PARAMETERS')) {
      return nextCodeIndex(tokens, index)!;
    }
  }
  return undefined;
}

function findAsIndex(tokens: readonly Token[], skipRanges: ReturnType<typeof annotationRanges>, fromIndex: number): number {
  let depth = 0;
  for (let index = fromIndex + 1; index < tokens.length; index += 1) {
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
    if (token.text.toUpperCase() === 'AS') return index;
  }
  return tokens.length;
}

function splitParameters(
  tokens: readonly Token[],
  skipRanges: ReturnType<typeof annotationRanges>,
  parametersIndex: number,
  endIndex: number,
): (readonly Token[])[] | undefined {
  const codeIndices: number[] = [];
  let depth = 0;
  for (let index = parametersIndex + 1; index < endIndex; index += 1) {
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
    if (segment.length < 3) return undefined;
    const name = tokens[segment[0]!]!;
    const colon = tokens[segment[1]!]!;
    if (name.kind !== 'word' || colon.text !== ':') return undefined;
    if (segment.length !== 3) return undefined; // type must be exactly one token
    const type = tokens[segment[2]!]!;
    rows.push([name, colon, type]);
  }

  return rows;
}
