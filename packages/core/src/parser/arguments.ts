import { findMatchingBracket, type Token } from './tokenizer.js';

export interface NamedArgument {
  readonly name: string;
  readonly nameIndex: number;
  readonly assignmentIndex: number;
  readonly valueStartIndex: number;
  readonly valueEndIndex: number;
}

export function parseTopLevelNamedArguments(tokens: readonly Token[], openingIndex: number): readonly NamedArgument[] | undefined {
  if (tokens[openingIndex]?.text !== '(') return undefined;
  const closingIndex = findMatchingBracket(tokens, openingIndex);
  if (closingIndex === undefined) return undefined;

  const significant = significantTokens(tokens, openingIndex + 1, closingIndex);
  if (significant.length === 0) return [];
  const arguments_: NamedArgument[] = [];
  let cursor = 0;
  while (cursor < significant.length) {
    const name = significant[cursor];
    const assignment = significant[cursor + 1];
    const valueStart = significant[cursor + 2];
    if (name === undefined || assignment === undefined || valueStart === undefined || name.depth !== 0 || assignment.depth !== 0 || !isIdentifier(tokens[name.index]) || tokens[assignment.index]?.text !== '=') return undefined;
    let valueEndIndex = valueStart.index;
    cursor += 3;
    while (cursor < significant.length && !isArgumentStart(tokens, significant[cursor], significant[cursor + 1])) {
      valueEndIndex = significant[cursor]!.index;
      cursor += 1;
    }
    arguments_.push({ name: tokens[name.index]!.text, nameIndex: name.index, assignmentIndex: assignment.index, valueStartIndex: valueStart.index, valueEndIndex });
  }
  return arguments_;
}

function significantTokens(tokens: readonly Token[], startIndex: number, endIndex: number): readonly { readonly index: number; readonly depth: number }[] {
  const result: { readonly index: number; readonly depth: number }[] = [];
  let depth = 0;
  for (let index = startIndex; index < endIndex; index += 1) {
    const token = tokens[index]!;
    if (token.kind === 'whitespace') continue;
    if (')]}'.includes(token.text)) depth -= 1;
    result.push({ index, depth });
    if ('([{'.includes(token.text)) depth += 1;
  }
  return result;
}

function isArgumentStart(tokens: readonly Token[], name: { readonly index: number; readonly depth: number } | undefined, assignment: { readonly index: number; readonly depth: number } | undefined): boolean {
  return name !== undefined && assignment !== undefined && name.depth === 0 && assignment.depth === 0 && isIdentifier(tokens[name.index]) && tokens[assignment.index]?.text === '=';
}

function isIdentifier(token: Token | undefined): token is Token {
  return token?.kind === 'word' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(token.text);
}