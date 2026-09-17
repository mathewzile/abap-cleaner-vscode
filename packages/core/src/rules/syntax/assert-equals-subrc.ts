import { findMatchingBracket, tokenize, type Token } from '../../parser/tokenizer.js';

export function simplifyAssertEqualsSubrc(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const match = subrcAssertMatch(tokens, index);
    if (match === undefined) {
      output.push(tokens[index]!.text);
      continue;
    }
    output.push(match.expected.text === '0' ? 'assert_subrc( )' : `assert_subrc( exp = ${match.expected.text} )`);
    index = match.closingIndex;
  }
  return output.join('');
}

function subrcAssertMatch(tokens: readonly Token[], assertIndex: number): { readonly expected: Token; readonly closingIndex: number } | undefined {
  const assertEquals = tokens[assertIndex];
  if (assertEquals?.kind !== 'word' || assertEquals.text.toUpperCase() !== 'ASSERT_EQUALS') return undefined;
  const className = previousNonWhitespace(tokens, assertIndex - 2);
  const selector = previousNonWhitespace(tokens, assertIndex - 1);
  const openingIndex = nextNonWhitespaceIndex(tokens, assertIndex + 1);
  if (className?.kind !== 'word' || className.text.toUpperCase() !== 'CL_ABAP_UNIT_ASSERT' || selector?.text !== '=>' || openingIndex === undefined || tokens[openingIndex]?.text !== '(') return undefined;
  const closingIndex = findMatchingBracket(tokens, openingIndex);
  if (closingIndex === undefined || tokens[closingIndex]!.line !== assertEquals.line) return undefined;
  const arguments_ = tokens.slice(openingIndex + 1, closingIndex).filter((token) => token.kind !== 'whitespace');
  const expected = simpleSubrcExpectedValue(arguments_);
  return expected === undefined ? undefined : { expected, closingIndex };
}

function simpleSubrcExpectedValue(tokens: readonly Token[]): Token | undefined {
  if (tokens.length !== 6 || tokens[1]?.text !== '=' || tokens[4]?.text !== '=') return undefined;
  const firstName = tokens[0]?.text.toUpperCase();
  const secondName = tokens[3]?.text.toUpperCase();
  const firstValue = tokens[2];
  const secondValue = tokens[5];
  const expected = firstName === 'EXP' ? firstValue : secondName === 'EXP' ? secondValue : undefined;
  const actual = firstName === 'ACT' ? firstValue : secondName === 'ACT' ? secondValue : undefined;
  return actual?.text.toUpperCase() === 'SY-SUBRC' && expected !== undefined && /^\d+$/.test(expected.text) ? expected : undefined;
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