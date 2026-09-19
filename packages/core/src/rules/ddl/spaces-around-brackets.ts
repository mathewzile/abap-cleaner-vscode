// Ported from com/sap/adt/abapcleaner/rules/ddl/spaces/DdlSpacesAroundBracketsRule.java @ v1.29.0
//
// Bounded subset: standardizes spacing around `[...]` cardinality and path-expression brackets
// only, using the upstream rule's defaults — at least one space before `[` and after `]` for
// ASSOCIATION/COMPOSITION cardinality (`ASSOCIATION [0..*]`), no space just inside either bracket
// in any case, and no space before a path-expression `[` or after its `]`. Parentheses `(...)` are
// not handled, since distinguishing a function call from an ABAP type cast or an arithmetic
// grouping needs the built-in-function/ABAP-type name lists this port does not have yet.
import { tokenize, findBracketPairs, type Token } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange } from './annotation-ranges.js';

interface Edit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export function normalizeDdlSpacesAroundBrackets(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const skipRanges = annotationRanges(sourceText, tokens);
  const edits: Edit[] = [];

  for (const pair of findBracketPairs(tokens)) {
    if (tokens[pair.openingIndex]!.text !== '[') continue;
    if (isInsideAnyRange(skipRanges, tokens[pair.openingIndex]!.offset)) continue;
    const isAssociation = isAssociationOrComposition(tokens, pair.openingIndex);
    edits.push(...openingBracketEdits(tokens, pair.openingIndex, isAssociation));
    edits.push(...closingBracketEdits(tokens, pair.closingIndex, isAssociation));
  }

  return edits.reduceRight((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

function isAssociationOrComposition(tokens: readonly Token[], openingIndex: number): boolean {
  let cursor = openingIndex - 1;
  while (cursor >= 0 && (tokens[cursor]!.kind === 'whitespace' || tokens[cursor]!.kind === 'comment')) cursor -= 1;
  const prevCode = tokens[cursor];
  return prevCode?.kind === 'word' && (prevCode.text.toUpperCase() === 'ASSOCIATION' || prevCode.text.toUpperCase() === 'COMPOSITION');
}

function openingBracketEdits(tokens: readonly Token[], index: number, isAssociation: boolean): Edit[] {
  const edits: Edit[] = [];
  const token = tokens[index]!;
  const prev = tokens[index - 1];

  // space before "[": at least one for cardinality, none for a path expression
  if (prev?.kind === 'whitespace' && !prev.text.includes('\n')) {
    if (isAssociation) {
      if (prev.text !== ' ') edits.push({ start: prev.offset, end: prev.offset + prev.text.length, text: ' ' });
    } else {
      edits.push({ start: prev.offset, end: prev.offset + prev.text.length, text: '' });
    }
  } else if (prev !== undefined && prev.kind !== 'whitespace' && isAssociation) {
    edits.push({ start: token.offset, end: token.offset, text: ' ' });
  }

  // no space just inside "[", in either case
  const next = tokens[index + 1];
  if (next?.kind === 'whitespace' && !next.text.includes('\n') && tokens[index + 2]?.kind !== 'comment') {
    edits.push({ start: next.offset, end: next.offset + next.text.length, text: '' });
  }
  return edits;
}

function closingBracketEdits(tokens: readonly Token[], index: number, isAssociation: boolean): Edit[] {
  const edits: Edit[] = [];
  const token = tokens[index]!;
  const prev = tokens[index - 1];

  // no space just inside "]", in either case
  if (prev?.kind === 'whitespace' && !prev.text.includes('\n')) {
    edits.push({ start: prev.offset, end: prev.offset + prev.text.length, text: '' });
  }

  // space after "]": at least one for cardinality, untouched for a path expression
  if (!isAssociation) return edits;
  const next = tokens[index + 1];
  if (next?.kind === 'whitespace' && !next.text.includes('\n')) {
    if (next.text !== ' ') edits.push({ start: next.offset, end: next.offset + next.text.length, text: ' ' });
  } else if (next !== undefined && next.kind !== 'whitespace' && next.kind !== 'comment') {
    edits.push({ start: token.offset + token.text.length, end: token.offset + token.text.length, text: ' ' });
  }
  return edits;
}
