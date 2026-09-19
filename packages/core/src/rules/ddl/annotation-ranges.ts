// Shared helper for DDL rules that must not touch annotation content (matching Java's
// `Command.isDdlAnnotation()` guard) because annotation layout is standardized by a separate,
// not-yet-ported rule (`DDL_ANNO_LAYOUT`). An annotation region starts at a `@name` token at the
// start of a line and extends, tracking bracket depth, until that depth returns to zero at a line
// end — covering multi-line annotation values such as `@UI.selectionVariant: [{ ... }]`.
import type { Token } from '../../parser/tokenizer.js';

export interface OffsetRange {
  readonly start: number;
  readonly end: number;
}

export function annotationRanges(sourceText: string, tokens: readonly Token[]): readonly OffsetRange[] {
  const ranges: OffsetRange[] = [];
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index]!;
    if (token.kind === 'word' && token.text.startsWith('@') && isLineStart(sourceText, token.offset)) {
      let depth = 0;
      let cursor = index;
      while (cursor < tokens.length) {
        const current = tokens[cursor]!;
        if (current.kind === 'punctuation') {
          if ('{[('.includes(current.text)) depth += 1;
          else if ('}])'.includes(current.text)) depth -= 1;
        }
        const next = tokens[cursor + 1];
        if (depth <= 0 && (next === undefined || (next.kind === 'whitespace' && next.text.includes('\n')))) break;
        cursor += 1;
      }
      const last = tokens[cursor]!;
      ranges.push({ start: token.offset, end: last.offset + last.text.length });
      index = cursor + 1;
    } else {
      index += 1;
    }
  }
  return ranges;
}

export function isInsideAnyRange(ranges: readonly OffsetRange[], offset: number): boolean {
  return ranges.some((range) => offset >= range.start && offset < range.end);
}

// True when nothing but whitespace precedes `offset` on its own line — not just literally at
// column 0. An entity-level annotation is conventionally unindented, but a parameter- or
// field-level annotation is normally indented (e.g. nested under `WITH PARAMETERS` or a select
// list), and the original `offset === 0 || sourceText[offset - 1] === '\n'` check only matched the
// former, silently failing to recognize (and thus not skipping) an indented annotation's content.
function isLineStart(sourceText: string, offset: number): boolean {
  const lineStart = sourceText.lastIndexOf('\n', offset - 1) + 1;
  return /^[ \t]*$/.test(sourceText.slice(lineStart, offset));
}
