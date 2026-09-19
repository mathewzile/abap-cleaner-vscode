// Ported from com/sap/adt/abapcleaner/rules/ddl/annotations/DdlAnnotationLayoutRule.java @ v1.29.0
//
// Bounded subset: unlike the upstream rule (which rewrites an annotation's whole nesting/one-liner/
// alignment layout via `DdlAnnotationScope`/`DdlAnnotationCommandWriter` — substantially more than
// a per-token rewrite, and out of scope for this port, like `DDL_ANNO_NESTING`), this only
// implements the two spacing behaviors documented as unconditional in the upstream rule's hints
// ("Spaces before '@' and around '.' will always be removed"): condensing an annotation's dotted
// path (from `@` up to its first top-level `:`) onto one contiguous run with no internal
// whitespace, and standardizing spacing around every `:` inside the annotation (no space before,
// one space after, matching the `SpaceAfterColon` default) — for both the path separator and any
// nested structured-value field separator. A colon already followed by a line break is left alone,
// since that is a deliberate multi-line value break, not a same-line spacing issue. Nesting
// depth/order, one-liner detection, value/table alignment, and brace/bracket inner spacing (a
// separate `SpaceInsideBraces`/`SpaceInsideBrackets` setting) are not implemented.
import { tokenize, type Token } from '../../parser/tokenizer.js';
import { annotationRanges } from './annotation-ranges.js';

interface Edit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export function normalizeDdlAnnotationLayout(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const ranges = annotationRanges(sourceText, tokens);
  const edits: Edit[] = [];

  for (const range of ranges) {
    const startIndex = tokens.findIndex((token) => token.offset === range.start);
    if (startIndex < 0) continue;

    const pathColonIndex = findFirstTopLevelColon(tokens, startIndex, range.end);
    if (pathColonIndex !== undefined) {
      edits.push(...condenseToZeroSpace(tokens, startIndex, pathColonIndex));
    }

    for (let index = startIndex; index < tokens.length && tokens[index]!.offset < range.end; index += 1) {
      if (tokens[index]!.kind === 'punctuation' && tokens[index]!.text === ':') {
        edits.push(...colonSpacingEdits(tokens, index));
      }
    }
  }

  return edits.reduceRight((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

function findFirstTopLevelColon(tokens: readonly Token[], startIndex: number, rangeEnd: number): number | undefined {
  let depth = 0;
  for (let index = startIndex; index < tokens.length && tokens[index]!.offset < rangeEnd; index += 1) {
    const token = tokens[index]!;
    if (token.kind !== 'punctuation') continue;
    if ('{[('.includes(token.text)) depth += 1;
    else if ('}])'.includes(token.text)) depth -= 1;
    else if (token.text === ':' && depth === 0) return index;
  }
  return undefined;
}

function condenseToZeroSpace(tokens: readonly Token[], firstIndex: number, lastIndex: number): Edit[] {
  // stops one token short of `lastIndex` so the whitespace immediately before it (the colon) stays
  // the exclusive responsibility of `colonSpacingEdits`, avoiding two edits on the same span
  const edits: Edit[] = [];
  for (let index = firstIndex + 1; index < lastIndex - 1; index += 1) {
    const token = tokens[index]!;
    if (token.kind === 'comment') return [];
    if (token.kind === 'whitespace' && token.text !== '') {
      edits.push({ start: token.offset, end: token.offset + token.text.length, text: '' });
    }
  }
  return edits;
}

function colonSpacingEdits(tokens: readonly Token[], index: number): Edit[] {
  const edits: Edit[] = [];
  const token = tokens[index]!;
  const prev = tokens[index - 1];
  const next = tokens[index + 1];

  if (prev?.kind === 'whitespace' && !prev.text.includes('\n')) {
    edits.push({ start: prev.offset, end: prev.offset + prev.text.length, text: '' });
  }

  if (next?.kind === 'whitespace') {
    if (!next.text.includes('\n') && next.text !== ' ') {
      edits.push({ start: next.offset, end: next.offset + next.text.length, text: ' ' });
    }
  } else if (next !== undefined && next.kind !== 'comment') {
    edits.push({ start: token.offset + token.text.length, end: token.offset + token.text.length, text: ' ' });
  }
  return edits;
}
