import { parseTopLevelNamedArguments } from '../../parser/arguments.js';
import { findMatchingBracket, tokenize, type Token } from '../../parser/tokenizer.js';

export function simplifyAssertEqualsBoolean(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const match = booleanAssertMatch(tokens, index);
    if (match === undefined) {
      output.push(tokens[index]!.text);
      continue;
    }
    output.push(`${match.assertMethod}( ${match.actualText} )`);
    index = match.closingIndex;
  }
  return output.join('');
}

function booleanAssertMatch(tokens: readonly Token[], assertIndex: number): { readonly assertMethod: string; readonly actualText: string; readonly closingIndex: number } | undefined {
  const assertEquals = tokens[assertIndex];
  if (assertEquals?.kind !== 'word' || assertEquals.text.toUpperCase() !== 'ASSERT_EQUALS') return undefined;
  const className = previousNonWhitespace(tokens, assertIndex - 2);
  const selector = previousNonWhitespace(tokens, assertIndex - 1);
  const openingIndex = nextNonWhitespaceIndex(tokens, assertIndex + 1);
  if (className?.kind !== 'word' || className.text.toUpperCase() !== 'CL_ABAP_UNIT_ASSERT' || selector?.text !== '=>' || openingIndex === undefined || tokens[openingIndex]?.text !== '(') return undefined;
  const closingIndex = findMatchingBracket(tokens, openingIndex);
  if (closingIndex === undefined || tokens[closingIndex]!.line !== assertEquals.line) return undefined;
  const arguments_ = parseTopLevelNamedArguments(tokens, openingIndex);
  const match = simpleBooleanArguments(tokens, arguments_);
  return match === undefined ? undefined : { ...match, closingIndex };
}

function simpleBooleanArguments(tokens: readonly Token[], arguments_: ReturnType<typeof parseTopLevelNamedArguments>): { readonly assertMethod: string; readonly actualText: string } | undefined {
  if (arguments_ === undefined || arguments_.length !== 2) return undefined;
  const expected = arguments_.find((argument) => argument.name.toUpperCase() === 'EXP');
  const actual = arguments_.find((argument) => argument.name.toUpperCase() === 'ACT');
  if (expected === undefined || actual === undefined || expected.valueStartIndex !== expected.valueEndIndex) return undefined;
  const expectedName = tokens[expected.valueStartIndex]!.text.toUpperCase();
  if (expectedName !== 'ABAP_TRUE' && expectedName !== 'ABAP_FALSE') return undefined;
  const actualText = tokens.slice(actual.valueStartIndex, actual.valueEndIndex + 1).map((token) => token.text).join('');
  return actualText.length === 0 ? undefined : { assertMethod: expectedName === 'ABAP_TRUE' ? 'assert_true' : 'assert_false', actualText };
}

function previousNonWhitespace(tokens: readonly Token[], index: number): Token | undefined {
  let cursor = index;
  while (cursor >= 0 && tokens[cursor]!.kind === 'whitespace') cursor -= 1;
  return tokens[cursor];
}

function nextNonWhitespaceIndex(tokens: readonly Token[], index: number): number | undefined {
  let cursor = index;
  while (cursor < tokens.length && tokens[cursor]!.kind === 'whitespace') cursor += 1;
  return cursor < tokens.length ? cursor : undefined;
}