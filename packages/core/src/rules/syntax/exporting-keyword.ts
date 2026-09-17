import { findMatchingBracket, tokenize, type Token } from '../../parser/tokenizer.js';

const PARAMETER_KEYWORDS = new Set(['IMPORTING', 'CHANGING', 'RECEIVING', 'EXCEPTIONS']);

export function removeOptionalExporting(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    if (isOptionalExporting(tokens, index)) {
      index += 1;
      continue;
    }
    output.push(tokens[index]!.text);
  }
  return output.join('');
}

function isOptionalExporting(tokens: readonly Token[], index: number): boolean {
  const token = tokens[index];
  if (token?.kind !== 'word' || token.text.toUpperCase() !== 'EXPORTING') return false;
  const before = previousNonWhitespace(tokens, index - 1);
  const after = nextNonWhitespace(tokens, index + 1);
  if (before?.text !== '(' || after?.kind !== 'word' || token.line !== before.line || after.line !== token.line) return false;
  const openingIndex = tokens.indexOf(before);
  const closingIndex = findMatchingBracket(tokens, openingIndex);
  if (closingIndex === undefined || tokens.slice(openingIndex, closingIndex + 1).some((child) => child.text.includes('\n'))) return false;
  if (hasTopLevelParameterKeyword(tokens, index + 1, closingIndex)) return false;
  return true;
}

function hasTopLevelParameterKeyword(tokens: readonly Token[], startIndex: number, closingIndex: number): boolean {
  let depth = 0;
  for (let index = startIndex; index < closingIndex; index += 1) {
    const token = tokens[index]!;
    if ('([{'.includes(token.text)) {
      depth += 1;
    } else if (')]}'.includes(token.text)) {
      depth -= 1;
    } else if (depth === 0 && token.kind === 'word' && PARAMETER_KEYWORDS.has(token.text.toUpperCase())) {
      return true;
    }
  }
  return false;
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