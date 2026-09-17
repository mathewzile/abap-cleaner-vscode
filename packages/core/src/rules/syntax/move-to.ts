import { tokenize, type Token } from '../../parser/tokenizer.js';

export function simplifyMoveTo(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const match = simpleMoveTo(tokens, index);
    if (match === undefined) {
      output.push(tokens[index]!.text);
      continue;
    }
    output.push(match.replacement);
    index = match.destinationIndex;
  }
  return output.join('');
}

function simpleMoveTo(tokens: readonly Token[], startIndex: number): { readonly replacement: string; readonly destinationIndex: number } | undefined {
  const significant = significantTokens(tokens, startIndex, 5);
  if (significant.length !== 5) return undefined;
  const move = significant[0]!;
  const source = significant[1]!;
  const to = significant[2]!;
  const destination = significant[3]!;
  const period = significant[4]!;
  if (move.kind !== 'word' || move.text.toUpperCase() !== 'MOVE' || (source.kind !== 'word' && source.kind !== 'literal') || to.kind !== 'word' || to.text.toUpperCase() !== 'TO' || destination.kind !== 'word' || !isPlainIdentifier(destination.text) || period.text !== '.' || move.line !== period.line) return undefined;
  return { replacement: `${destination.text} = ${source.text}`, destinationIndex: destination.index };
}

function isPlainIdentifier(text: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
}

function significantTokens(tokens: readonly Token[], startIndex: number, count: number): readonly (Token & { readonly index: number })[] {
  const result: (Token & { readonly index: number })[] = [];
  for (let index = startIndex; index < tokens.length && result.length < count; index += 1) {
    if (tokens[index]!.kind !== 'whitespace') result.push({ ...tokens[index]!, index });
  }
  return result;
}