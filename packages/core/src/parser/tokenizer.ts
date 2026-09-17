import type { CleanupLanguage } from '../api.js';

export type TokenKind = 'whitespace' | 'word' | 'punctuation' | 'literal' | 'comment';

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  readonly offset: number;
  readonly line: number;
}

export interface BracketPair {
  readonly openingIndex: number;
  readonly closingIndex: number;
}

export function tokenize(sourceText: string, language: CleanupLanguage): readonly Token[] {
  const text = sourceText;
  const tokens: Token[] = [];
  let offset = 0;
  let line = 1;

  while (offset < text.length) {
    const start = offset;
    const startLine = line;
    const character = text[offset]!;
    let kind: TokenKind;

    if (isWhitespace(character)) {
      offset = readWhile(text, offset, isWhitespace);
      kind = 'whitespace';
    } else if (isLineComment(text, offset, language)) {
      offset = readToLineEnd(text, offset);
      kind = 'comment';
    } else if (language === 'DDL' || language === 'DCL') {
      ({ offset, kind } = readDdlToken(text, offset));
    } else {
      ({ offset, kind } = readAbapToken(text, offset));
    }

    const tokenText = text.slice(start, offset);
    tokens.push({ kind, text: tokenText, offset: start, line: startLine });
    line += countLineFeeds(tokenText);
  }

  return tokens;
}

function readAbapToken(text: string, offset: number): { offset: number; kind: TokenKind } {
  const character = text[offset]!;
  if (character === '"' || (character === '*' && isAtLineStart(text, offset))) {
    return { offset: readToLineEnd(text, offset), kind: 'comment' };
  }
  if (character === "'" || character === '`') {
    return { offset: readLiteral(text, offset, character), kind: 'literal' };
  }
  if ('.,:(){}[]'.includes(character)) {
    return { offset: offset + 1, kind: 'punctuation' };
  }
  if (character === '|') {
    return { offset: readTemplateSegment(text, offset), kind: 'literal' };
  }
  if (text.startsWith('->', offset)) {
    return { offset: offset + 2, kind: 'punctuation' };
  }
  if (isSeparatedArithmeticOperator(text, offset)) {
    return { offset: offset + 1, kind: 'punctuation' };
  }
  if ('=<>!&'.includes(character)) {
    return { offset: readWhile(text, offset, (next) => '=<>!&'.includes(next)), kind: 'punctuation' };
  }
  return { offset: readAbapWord(text, offset), kind: 'word' };
}

function readAbapWord(text: string, offset: number): number {
  let cursor = offset;
  while (cursor < text.length && !isWhitespace(text[cursor]!) && !'.,:(){}[]"\'`|=<>!&'.includes(text[cursor]!)) {
    if (text.startsWith('->', cursor) || isSeparatedArithmeticOperator(text, cursor)) break;
    cursor += 1;
  }
  return cursor;
}

function isSeparatedArithmeticOperator(text: string, offset: number): boolean {
  const character = text[offset];
  return character !== undefined && '+-*/'.includes(character)
    && isWhitespace(text[offset - 1] ?? '') && isWhitespace(text[offset + 1] ?? '');
}

export function findBracketPairs(tokens: readonly Token[]): readonly BracketPair[] {
  const pairs: BracketPair[] = [];
  const stack: { readonly token: string; readonly index: number }[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const text = tokens[index]!.text;
    if (text === '(' || text === '[' || text === '{') {
      stack.push({ token: text, index });
    } else if (text === ')' || text === ']' || text === '}') {
      const opening = stack.at(-1);
      if (opening !== undefined && matchingBracket(opening.token) === text) {
        pairs.push({ openingIndex: opening.index, closingIndex: index });
        stack.pop();
      }
    }
  }
  return pairs;
}

export function findMatchingBracket(tokens: readonly Token[], openingIndex: number): number | undefined {
  return findBracketPairs(tokens).find((pair) => pair.openingIndex === openingIndex)?.closingIndex;
}

function matchingBracket(opening: string): string {
  return opening === '(' ? ')' : opening === '[' ? ']' : '}';
}

function readDdlToken(text: string, offset: number): { offset: number; kind: TokenKind } {
  const character = text[offset]!;
  if (text.startsWith('/*', offset)) {
    const commentEnd = text.indexOf('*/', offset + 2);
    return { offset: commentEnd < 0 ? text.length : commentEnd + 2, kind: 'comment' };
  }
  if (character === "'") {
    return { offset: readLiteral(text, offset, character), kind: 'literal' };
  }
  if (':,;(){}[]'.includes(character) || '+-*/'.includes(character)) {
    return { offset: offset + 1, kind: 'punctuation' };
  }
  if ('<>!='.includes(character)) {
    return { offset: readWhile(text, offset, (next) => '<>!='.includes(next)), kind: 'punctuation' };
  }
  return { offset: readWhile(text, offset, (next) => !isWhitespace(next) && !':,;(){}[]<>!=+-*/\''.includes(next)), kind: 'word' };
}

function readLiteral(text: string, offset: number, delimiter: string): number {
  let cursor = offset + 1;
  while (cursor < text.length) {
    const delimiterIndex = text.indexOf(delimiter, cursor);
    if (delimiterIndex < 0) {
      return text.length;
    }
    if (text[delimiterIndex + 1] !== delimiter) {
      return delimiterIndex + 1;
    }
    cursor = delimiterIndex + 2;
  }
  return text.length;
}

function readTemplateSegment(text: string, offset: number): number {
  let cursor = offset + 1;
  while (cursor < text.length) {
    if (text[cursor] === '\\') {
      cursor += 2;
    } else if (text[cursor] === '|' || text[cursor] === '{') {
      return cursor + 1;
    } else {
      cursor += 1;
    }
  }
  return text.length;
}

function isLineComment(text: string, offset: number, language: CleanupLanguage): boolean {
  return (language === 'DDL' || language === 'DCL') && (text.startsWith('//', offset) || text.startsWith('--', offset));
}

function readToLineEnd(text: string, offset: number): number {
  const lineEnd = text.indexOf('\n', offset);
  return lineEnd < 0 ? text.length : lineEnd;
}

function readWhile(text: string, offset: number, predicate: (character: string) => boolean): number {
  let cursor = offset;
  while (cursor < text.length && predicate(text[cursor]!)) {
    cursor += 1;
  }
  return cursor;
}

function isWhitespace(character: string): boolean {
  return character === ' ' || character === '\t' || character === '\u00a0' || character === '\r' || character === '\n';
}

function isAtLineStart(text: string, offset: number): boolean {
  return offset === 0 || text[offset - 1] === '\n';
}

function countLineFeeds(text: string): number {
  return [...text].filter((character) => character === '\n').length;
}
