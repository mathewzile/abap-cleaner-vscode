import { parseTopLevelNamedArguments } from '../../parser/arguments.js';
import { findMatchingBracket, tokenize, type Token } from '../../parser/tokenizer.js';

export function standardizeSimpleAssertEqualsParameterOrder(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const replacements: { readonly start: number; readonly end: number; readonly text: string }[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const match = reversedSimpleAssertEquals(tokens, index);
    if (match !== undefined) replacements.push(match);
  }
  return replacements.reduceRight((text, replacement) => text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end), sourceText);
}

function reversedSimpleAssertEquals(tokens: readonly Token[], index: number): { readonly start: number; readonly end: number; readonly text: string } | undefined {
  if (tokens[index]?.kind !== 'word' || tokens[index]?.text.toUpperCase() !== 'ASSERT_EQUALS') return undefined;
  const className = previousCode(tokens, index - 2);
  const selector = previousCode(tokens, index - 1);
  const openingIndex = nextCodeIndex(tokens, index + 1);
  if (className?.text.toUpperCase() !== 'CL_ABAP_UNIT_ASSERT' || selector?.text !== '=>' || openingIndex === undefined || tokens[openingIndex]?.text !== '(') return undefined;
  const closingIndex = findMatchingBracket(tokens, openingIndex);
  if (closingIndex === undefined || tokens[closingIndex]!.line !== tokens[index]!.line || tokens.slice(index, closingIndex + 1).some((token) => token.kind === 'comment') || hasTrailingComment(tokens, closingIndex)) return undefined;
  const arguments_ = parseTopLevelNamedArguments(tokens, openingIndex);
  if (arguments_ === undefined || arguments_.length !== 2 || arguments_[0]?.name.toUpperCase() !== 'ACT' || arguments_[1]?.name.toUpperCase() !== 'EXP') return undefined;
  const [actual, expected] = arguments_;
  if (!isScalar(tokens[actual.valueStartIndex]) || actual.valueStartIndex !== actual.valueEndIndex || !isScalar(tokens[expected.valueStartIndex]) || expected.valueStartIndex !== expected.valueEndIndex) return undefined;
  return {
    start: tokens[openingIndex]!.offset,
    end: tokens[closingIndex]!.offset + 1,
    text: `( exp = ${tokens[expected.valueStartIndex]!.text} act = ${tokens[actual.valueStartIndex]!.text} )`,
  };
}

function isScalar(token: Token | undefined): boolean {
  return token?.kind === 'word' || token?.kind === 'literal';
}

function hasTrailingComment(tokens: readonly Token[], closingIndex: number): boolean {
  for (let index = closingIndex + 1; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.kind === 'comment') return token.line === tokens[closingIndex]!.line;
    if (token.kind !== 'whitespace' && token.text !== '.') return false;
    if (token.kind === 'whitespace' && /\r|\n/.test(token.text)) return false;
  }
  return false;
}

function previousCode(tokens: readonly Token[], index: number): Token | undefined {
  let cursor = index;
  while (cursor >= 0 && tokens[cursor]!.kind === 'whitespace') cursor -= 1;
  return tokens[cursor];
}

function nextCodeIndex(tokens: readonly Token[], index: number): number | undefined {
  let cursor = index;
  while (cursor < tokens.length && tokens[cursor]!.kind === 'whitespace') cursor += 1;
  return cursor < tokens.length ? cursor : undefined;
}