// Shared helpers for DDL_POSITION_* rules, operating on the flat DDL token stream rather than a
// Command tree: forcing a line break with a specific column indent before a token (the ALWAYS
// branch of Java's `RuleForDdlPosition.breakBefore()`, which is every studied DDL_POSITION rule's
// default) and condensing a two-word keyword phrase (e.g. "GROUP" + "BY", "UNION" + "ALL") onto
// one line with a single separating space (`condense()`).
import type { Token } from '../../parser/tokenizer.js';

export interface Edit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export function breakBeforeWithIndent(tokens: readonly Token[], index: number, indentSpaces: number): Edit[] {
  const token = tokens[index]!;
  const prev = tokens[index - 1];
  const indent = ' '.repeat(indentSpaces);
  if (prev === undefined || prev.kind === 'comment') return [];

  if (prev.kind !== 'whitespace') {
    return [{ start: token.offset, end: token.offset, text: `\n${indent}` }];
  }
  if (!prev.text.includes('\n')) {
    return [{ start: prev.offset, end: prev.offset + prev.text.length, text: `\n${indent}` }];
  }

  const lastNewlineIndex = prev.text.lastIndexOf('\n');
  const trailingIndent = prev.text.slice(lastNewlineIndex + 1);
  if (trailingIndent === indent) return [];
  return [{ start: prev.offset + lastNewlineIndex + 1, end: prev.offset + prev.text.length, text: indent }];
}

export function condensePhrase(tokens: readonly Token[], firstIndex: number, lastIndex: number): Edit[] {
  const edits: Edit[] = [];
  for (let index = firstIndex + 1; index < lastIndex; index += 1) {
    const token = tokens[index]!;
    if (token.kind === 'comment') return [];
    if (token.kind === 'whitespace' && token.text !== ' ') {
      edits.push({ start: token.offset, end: token.offset + token.text.length, text: ' ' });
    }
  }
  return edits;
}

export function nextCodeIndex(tokens: readonly Token[], fromIndex: number): number | undefined {
  for (let index = fromIndex + 1; index < tokens.length; index += 1) {
    if (tokens[index]!.kind !== 'whitespace' && tokens[index]!.kind !== 'comment') return index;
  }
  return undefined;
}

export function prevCodeIndex(tokens: readonly Token[], fromIndex: number): number | undefined {
  for (let index = fromIndex - 1; index >= 0; index -= 1) {
    if (tokens[index]!.kind !== 'whitespace' && tokens[index]!.kind !== 'comment') return index;
  }
  return undefined;
}

export function nextCodeWordIs(tokens: readonly Token[], fromIndex: number, word: string): boolean {
  const index = nextCodeIndex(tokens, fromIndex);
  return index !== undefined && tokens[index]!.kind === 'word' && tokens[index]!.text.toUpperCase() === word;
}

// Applies edits rightmost-first so each edit's {start,end} — always computed against the original
// `sourceText` offsets — stays valid regardless of how earlier (leftward) edits shift text length.
// Sorting defensively (rather than requiring callers to build `edits` in descending-offset order)
// matters once a rule computes edits across more than one pass over the same rows/tokens (e.g. an
// indent pass and a separate column-alignment pass) — those interleave in offset-space, and pushing
// them in a "these first, then those" order is exactly the array order that broke this before it
// was fixed here.
export function applyEdits(sourceText: string, edits: readonly Edit[]): string {
  return [...edits]
    .sort((a, b) => b.start - a.start)
    .reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

// Only adjusts the blank-line count of a break that already exists before `index` (never creates
// one), matching Java's `if (firstToken.lineBreaks == 0) return;` guard shared by every
// `DdlEmptyLineType` boundary.
export function ensureAtLeastOneBlankLineBefore(tokens: readonly Token[], index: number): Edit[] {
  const prev = tokens[index - 1];
  if (prev === undefined || prev.kind !== 'whitespace' || countLineFeeds(prev.text) < 1) return [];
  if (countLineFeeds(prev.text) >= 2) return [];
  const firstNewline = prev.text.indexOf('\n');
  return [{ start: prev.offset + firstNewline, end: prev.offset + firstNewline, text: '\n' }];
}

export function capBlankLinesBefore(tokens: readonly Token[], index: number, maxBlankLines: number): Edit[] {
  const prev = tokens[index - 1];
  if (prev === undefined || prev.kind !== 'whitespace') return [];
  const maxLineFeeds = maxBlankLines + 1;
  if (countLineFeeds(prev.text) <= maxLineFeeds) return [];
  const trailingIndent = /[ \t]*$/.exec(prev.text)![0];
  return [{ start: prev.offset, end: prev.offset + prev.text.length, text: '\n'.repeat(maxLineFeeds) + trailingIndent }];
}

function countLineFeeds(text: string): number {
  let count = 0;
  for (const character of text) if (character === '\n') count += 1;
  return count;
}
