import { tokenize, type Token } from '../../parser/tokenizer.js';

export function normalizeNotIs(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const match = simpleNotIs(tokens, index);
    if (match !== undefined) {
      for (let operandIndex = match.operandStart; operandIndex <= match.isIndex; operandIndex += 1) {
        output.push(tokens[operandIndex]!.text);
      }
      output.push(tokens[index + 1]!.text, tokens[index]!.text);
      index = match.isIndex;
    } else {
      output.push(tokens[index]!.text);
    }
  }
  return output.join('');
}

function simpleNotIs(tokens: readonly Token[], index: number): { readonly operandStart: number; readonly isIndex: number } | undefined {
  const not = tokens[index];
  const beforeOperand = tokens[index + 1];
  if (not?.kind !== 'word' || not.text.toUpperCase() !== 'NOT' || !isSingleLineWhitespace(beforeOperand, not.line) || isInChainedStatement(tokens, index)) return undefined;
  const operandStart = index + 2;
  const operandEnd = tokens[operandStart]?.kind === 'word'
    ? operandStart
    : tokens[operandStart]?.text === '<' && tokens[operandStart + 1]?.kind === 'word' && tokens[operandStart + 2]?.text === '>'
      ? operandStart + 2
      : undefined;
  if (operandEnd === undefined) return undefined;
  const beforeIs = tokens[operandEnd + 1];
  const is = tokens[operandEnd + 2];
  if (!isSingleLineWhitespace(beforeIs, not.line) || is?.kind !== 'word' || is.text.toUpperCase() !== 'IS') return undefined;
  return { operandStart, isIndex: operandEnd + 2 };
}

function isSingleLineWhitespace(token: Token | undefined, line: number): boolean {
  return token?.kind === 'whitespace' && token.line === line && !token.text.includes('\n');
}

function isInChainedStatement(tokens: readonly Token[], index: number): boolean {
  for (let cursor = index; cursor >= 0 && tokens[cursor]!.text !== '.'; cursor -= 1) {
    if (tokens[cursor]!.text === ':') return true;
  }
  for (let cursor = index; cursor < tokens.length && tokens[cursor]!.text !== '.'; cursor += 1) {
    if (tokens[cursor]!.text === ':') return true;
  }
  return false;
}