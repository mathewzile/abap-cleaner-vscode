// Ported from com/sap/adt/abapcleaner/rules/ddl/alignment/DdlAlignSourceParametersRule.java @ v1.29.0
//
// Bounded subset: aligns the parameters supplied to a parameterized data source (`select from
// I_Entity( P_Param : value, ... )`, `join I_Entity( ... )`, or `on I_Entity( ... )`), reusing
// `DDL_ALIGN_ENTITY_PARAMETERS`'s exact technique — every parameter must have the simple shape
// `<name> : <single-token-value>`. A dotted qualified path such as `$parameters.P_AnyParam` is a
// single "word" token under this port's DDL tokenizer (`.` is not a DDL punctuation character), so
// it qualifies as a simple single-token value; a value built from more than one token (e.g. an
// arithmetic expression `a + b`, or a parenthesized `Term` like `abap.char( 10 )`) does not. If EVEN
// ONE parameter in the parenthesized list doesn't match the simple shape, alignment is cancelled for
// the *whole* clause, matching upstream's "if one Command is blocked, cancel alignment entirely"
// behavior. Also requires every parameter row to sit on its own distinct source
// line — rows crammed onto one physical line are left untouched, since column alignment is
// inherently a vertical/cross-line concept. Does NOT implement: repositioning the opening
// parenthesis or the first parameter (`ParameterPos` — upstream's default moves the first parameter
// below the view/source name plus indent; this port leaves whatever line breaks already exist
// untouched) or repositioning the `AS <alias>` after the closing parenthesis (`AsAliasPos`) — both
// are pure layout/repositioning concerns independent of column alignment and are left for a future
// pass. A data source invocation whose parameter list spans nested brackets that don't balance
// within the source text, or that contains zero or one parameter, is also left untouched (nothing to
// align).
import { tokenize, findMatchingBracket, type Token } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange, type OffsetRange } from './annotation-ranges.js';
import { applyEdits, nextCodeIndex, type Edit } from './position-helpers.js';
import { alignColumnsLeftAligned } from '../syntax/align-helpers.js';

const SOURCE_KEYWORDS = new Set(['FROM', 'JOIN', 'ON']);

export function alignDdlSourceParameters(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const skipRanges = annotationRanges(sourceText, tokens);

  const edits: Edit[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.kind !== 'word' || isInsideAnyRange(skipRanges, token.offset)) continue;
    if (!SOURCE_KEYWORDS.has(token.text.toUpperCase())) continue;

    const identIndex = nextCodeIndex(tokens, index);
    if (identIndex === undefined || tokens[identIndex]!.kind !== 'word') continue;
    const parenIndex = nextCodeIndex(tokens, identIndex);
    if (parenIndex === undefined || tokens[parenIndex]!.text !== '(') continue;
    const closeParenIndex = findMatchingBracket(tokens, parenIndex);
    if (closeParenIndex === undefined) continue;

    const rows = splitParameters(tokens, skipRanges, parenIndex, closeParenIndex);
    if (rows === undefined || rows.length < 2) continue;
    if (rows.some((row, rowIndex) => rowIndex > 0 && row[0]!.line === rows[rowIndex - 1]![0]!.line)) continue;

    edits.push(...alignColumnsLeftAligned(rows));
  }

  return applyEdits(sourceText, edits);
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
    if (segment.length !== 3) return undefined; // name, colon, single-token value only
    const name = tokens[segment[0]!]!;
    const colon = tokens[segment[1]!]!;
    const value = tokens[segment[2]!]!;
    if (name.kind !== 'word' || colon.text !== ':') return undefined;
    rows.push([name, colon, value]);
  }

  return rows;
}
