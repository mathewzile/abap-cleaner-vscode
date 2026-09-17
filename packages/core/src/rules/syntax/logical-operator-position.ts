import { tokenize, type Token } from '../../parser/tokenizer.js';

const LOGICAL_STATEMENT_KEYWORDS = new Set(['IF', 'ELSEIF', 'WHILE', 'CHECK', 'ASSERT']);
const WHERE_STATEMENT_KEYWORDS = new Set(['LOOP', 'DELETE']);
const BOOLEAN_OPERATORS = new Set(['AND', 'OR', 'EQUIV']);

export function moveTerminalLogicalOperators(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];
  let statementKeyword: string | undefined;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.text === '.' && !isDecimalSeparator(tokens, index)) statementKeyword = undefined;
    if (token.kind === 'word' && statementKeyword === undefined) statementKeyword = token.text.toUpperCase();

    const whitespaceAfter = tokens[index + 1];
    if (statementKeyword !== undefined && shouldMoveTerminalOperator(statementKeyword, token, whitespaceAfter)) {
      if (output.at(-1)?.trim() === '') output.pop();
      output.push(whitespaceAfter!.text, token.text, ' ');
      index += 1;
      continue;
    }
    output.push(token.text);
  }
  return output.join('');
}

function shouldMoveTerminalOperator(statementKeyword: string, token: Token, whitespaceAfter: Token | undefined): boolean {
  if (LOGICAL_STATEMENT_KEYWORDS.has(statementKeyword)) return isTerminalBooleanOperator(token, whitespaceAfter);
  return WHERE_STATEMENT_KEYWORDS.has(statementKeyword) && isTerminalWhereKeyword(token, whitespaceAfter);
}

function isTerminalBooleanOperator(token: Token, whitespaceAfter: Token | undefined): boolean {
  return token.kind === 'word'
    && BOOLEAN_OPERATORS.has(token.text.toUpperCase())
    && whitespaceAfter?.kind === 'whitespace'
    && /\r?\n/.test(whitespaceAfter.text);
}

function isDecimalSeparator(tokens: readonly Token[], index: number): boolean {
  const previous = previousNonWhitespace(tokens, index - 1);
  const next = nextNonWhitespace(tokens, index + 1);
  return previous?.kind === 'word' && next?.kind === 'word' && /^\d+$/.test(previous.text) && /^\d+$/.test(next.text);
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

function isTerminalWhereKeyword(token: Token, whitespaceAfter: Token | undefined): boolean {
  return token.kind === 'word'
    && token.text.toUpperCase() === 'WHERE'
    && whitespaceAfter?.kind === 'whitespace'
    && /\r?\n/.test(whitespaceAfter.text);
}