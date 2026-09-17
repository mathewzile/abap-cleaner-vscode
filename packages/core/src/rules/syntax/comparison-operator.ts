import { tokenize, type Token } from '../../parser/tokenizer.js';

const SYMBOLIC_OPERATORS: Readonly<Record<string, string>> = {
  EQ: '=',
  LT: '<',
  LE: '<=',
  NE: '<>',
  GE: '>=',
  GT: '>',
};

const LOGICAL_STATEMENT_KEYWORDS = new Set(['IF', 'ELSEIF', 'CHECK', 'WHILE', 'ASSERT']);

export function normalizeComparisonOperators(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];
  let statementKeyword: string | undefined;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.text === '.' && !isDecimalSeparator(tokens, index)) statementKeyword = undefined;
    if (token.kind === 'word' && statementKeyword === undefined) statementKeyword = token.text.toUpperCase();
    const replacement = statementKeyword !== undefined && LOGICAL_STATEMENT_KEYWORDS.has(statementKeyword)
      ? comparisonReplacement(tokens, index)
      : undefined;
    output.push(replacement ?? token.text);
  }
  return output.join('');
}

function isDecimalSeparator(tokens: readonly Token[], index: number): boolean {
  const previous = previousNonWhitespace(tokens, index - 1);
  const next = nextNonWhitespace(tokens, index + 1);
  return previous?.kind === 'word' && next?.kind === 'word' && /^\d+$/.test(previous.text) && /^\d+$/.test(next.text);
}

function comparisonReplacement(tokens: readonly Token[], index: number): string | undefined {
  const token = tokens[index]!;
  const replacement = SYMBOLIC_OPERATORS[token.text.toUpperCase()];
  if (replacement === undefined) return undefined;
  const previous = previousNonWhitespace(tokens, index - 1);
  const next = nextNonWhitespace(tokens, index + 1);
  return isOperand(previous) && isOperand(next) ? replacement : undefined;
}

function previousNonWhitespace(tokens: readonly Token[], index: number): Token | undefined {
  let cursor = index;
  while (cursor >= 0 && tokens[cursor]!.kind === 'whitespace') cursor -= 1;
  return tokens[cursor];
}

function nextNonWhitespace(tokens: readonly Token[], index: number): Token | undefined {
  let cursor = index;
  while (cursor < tokens.length && tokens[cursor]!.kind === 'whitespace') cursor += 1;
  return tokens[cursor];
}

function isOperand(token: Token | undefined): boolean {
  return token?.kind === 'word' || token?.kind === 'literal';
}