import { tokenize, type Token } from '../../parser/tokenizer.js';

export function removeSimpleReceiving(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const match = simpleReceiving(tokens, index);
    if (match === undefined) {
      output.push(tokens[index]!.text);
      continue;
    }
    output.push(match.replacement);
    index = match.lastRemovedIndex;
  }
  return output.join('');
}

function simpleReceiving(tokens: readonly Token[], startIndex: number): { readonly replacement: string; readonly lastRemovedIndex: number } | undefined {
  const significant = significantTokens(tokens, startIndex, 10);
  const previous = previousNonWhitespace(tokens, startIndex - 1);
  if (previous !== undefined && previous.text !== '.') return undefined;

  const hasSelector = significant[1]?.text === '->' || significant[1]?.text === '=>';
  const callEnd = hasSelector ? significant[2] : significant[0];
  const opening = significant[hasSelector ? 3 : 1];
  const receiving = significant[hasSelector ? 4 : 2];
  const parameter = significant[hasSelector ? 5 : 3];
  const assignment = significant[hasSelector ? 6 : 4];
  const target = significant[hasSelector ? 7 : 5];
  const closing = significant[hasSelector ? 8 : 6];
  const period = significant[hasSelector ? 9 : 7];
  if (!isPlainIdentifier(significant[0]?.text) || callEnd === undefined || target === undefined || !isPlainIdentifier(callEnd.text) || opening?.text !== '(' || receiving?.kind !== 'word' || receiving.text.toUpperCase() !== 'RECEIVING' || !isPlainIdentifier(parameter?.text) || assignment?.text !== '=' || !isPlainIdentifier(target.text) || closing?.text !== ')' || period?.text !== '.' || significant[0]!.line !== period.line) return undefined;
  const callText = tokens.slice(startIndex, opening.index + 1).map((token) => token.text).join('');
  return { replacement: `${target.text} = ${callText}`, lastRemovedIndex: target.index };
}

function isPlainIdentifier(text: string | undefined): boolean {
  return text !== undefined && /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
}

function previousNonWhitespace(tokens: readonly Token[], index: number): Token | undefined {
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    if (tokens[cursor]!.kind !== 'whitespace') return tokens[cursor];
  }
  return undefined;
}

function significantTokens(tokens: readonly Token[], startIndex: number, count: number): readonly (Token & { readonly index: number })[] {
  const result: (Token & { readonly index: number })[] = [];
  for (let index = startIndex; index < tokens.length && result.length < count; index += 1) {
    if (tokens[index]!.kind !== 'whitespace') result.push({ ...tokens[index]!, index });
  }
  return result;
}