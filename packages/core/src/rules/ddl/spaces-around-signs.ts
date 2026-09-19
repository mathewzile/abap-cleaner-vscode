// Ported from com/sap/adt/abapcleaner/rules/ddl/spaces/DdlSpacesAroundSignsRule.java @ v1.29.0
//
// Bounded subset: standardizes comma spacing (no space before, exactly one space after, unless the
// comma is at line end or the next token is a closing bracket) and `//`/`--` line-end comment
// marker spacing (at least one space before when attached to code on the same line, one space
// after the marker unless it looks like a "///"/"---" separator comment), matching the upstream
// rule's ALWAYS/NEVER defaults for those settings. Colon spacing, arithmetic-operator spacing, and
// their path-expression/cardinality/namespace exceptions are not handled, since those need the
// DDL-specific token classification (`isDdlParameterColon`, `mayBeFollowedByArithmeticOp`, etc.)
// this port does not have yet.
import { tokenize, type Token } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange } from './annotation-ranges.js';

interface Edit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export function normalizeDdlSpacesAroundSigns(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const skipRanges = annotationRanges(sourceText, tokens);
  const edits: Edit[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (isInsideAnyRange(skipRanges, token.offset)) continue;
    if (token.kind === 'comment' && isLineEndCommentMarker(token.text)) {
      edits.push(...commentMarkerEdits(tokens, index));
    } else if (token.kind === 'punctuation' && token.text === ',') {
      edits.push(...commaEdits(sourceText, tokens, index));
    }
  }

  return edits.reduceRight((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

function isLineEndCommentMarker(text: string): boolean {
  return text.startsWith('//') || text.startsWith('--');
}

function commentMarkerEdits(tokens: readonly Token[], index: number): Edit[] {
  const edits: Edit[] = [];
  const token = tokens[index]!;
  const prev = tokens[index - 1];

  // at least one space before the marker, only when it is attached to code on the same line
  if (prev !== undefined && prev.kind !== 'whitespace') {
    edits.push({ start: token.offset, end: token.offset, text: ' ' });
  }

  // one space after the marker (// or --), skipping "///" or "---" separator comments
  const markerLength = 2;
  const rest = token.text.slice(markerLength);
  if (rest.length > 0 && rest[0] !== ' ' && rest[0] !== token.text[0]) {
    edits.push({ start: token.offset + markerLength, end: token.offset + markerLength, text: ' ' });
  }
  return edits;
}

function commaEdits(sourceText: string, tokens: readonly Token[], index: number): Edit[] {
  const edits: Edit[] = [];
  const token = tokens[index]!;
  const prev = tokens[index - 1];

  // no space before the comma
  if (prev?.kind === 'whitespace' && !prev.text.includes('\n')) {
    edits.push({ start: prev.offset, end: prev.offset + prev.text.length, text: '' });
  }

  // exactly one space after the comma, unless the comma is at line end or is followed by a closing bracket
  const gapEndsAt = token.offset + token.text.length;
  const afterGap = tokens[index + 1]?.kind === 'whitespace' ? index + 2 : index + 1;
  const gapEnd = tokens[index + 1]?.kind === 'whitespace' ? tokens[index + 1]!.offset + tokens[index + 1]!.text.length : gapEndsAt;
  const hasNewlineGap = tokens[index + 1]?.kind === 'whitespace' && tokens[index + 1]!.text.includes('\n');
  const next = tokens[afterGap];
  if (!hasNewlineGap && next !== undefined && !')]}'.includes(next.text) && sourceText.slice(gapEndsAt, gapEnd) !== ' ') {
    edits.push({ start: gapEndsAt, end: gapEnd, text: ' ' });
  }
  return edits;
}
