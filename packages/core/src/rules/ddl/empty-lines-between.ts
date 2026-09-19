// Ported from com/sap/adt/abapcleaner/rules/ddl/emptylines/DdlEmptyLinesBetweenSectionsRule.java @ v1.29.0
//
// Bounded subset: of the 8 section boundaries this rule standardizes, implements the 5 that don't
// need JOIN/ASSOCIATION-start detection (upstream `startsDdlJoin()`/`startsDdlAssociation()`,
// deferred for the same reason `DDL_POSITION_JOIN`/`DDL_POSITION_ASSOCIATION` are deferred) or
// "which top-level command precedes this one" context — all using the same reusable
// `ensureAtLeastOneBlankLineBefore`/`capBlankLinesBefore` helpers as the upstream rule's
// `ALWAYS_AT_LEAST_ONE`/`NEVER` defaults, and never creating a line break where none exists
// (matching Java's `if (firstToken.lineBreaks == 0) return;` guard):
//   - at least one blank line between trailing annotations and the DEFINE/EXTEND/ANNOTATE keyword;
//   - at least one blank line before the select list's opening `{` and after its closing `}`;
//   - no blank line directly after `{` or directly before `}`.
// Not implemented: the blank-line boundaries between "AS SELECT FROM"/select-list and the first
// JOIN, between a JOIN and the first ASSOCIATION, and between a `WITH PARAMETERS (...)` closing `)`
// and `AS SELECT`/`AS PROJECTION` — all need either JOIN/ASSOCIATION-start detection or
// "which top-level command precedes this token" context this port does not have.
import { tokenize, findBracketPairs } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange } from './annotation-ranges.js';
import { applyEdits, capBlankLinesBefore, ensureAtLeastOneBlankLineBefore, nextCodeIndex, type Edit } from './position-helpers.js';

const DEFINE_PHRASE_START = new Set(['DEFINE', 'EXTEND', 'ANNOTATE']);

export function normalizeDdlEmptyLinesBetween(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const skipRanges = annotationRanges(sourceText, tokens);
  const edits: Edit[] = [];

  for (const pair of findBracketPairs(tokens)) {
    if (tokens[pair.openingIndex]!.text !== '{') continue;
    if (isInsideAnyRange(skipRanges, tokens[pair.openingIndex]!.offset)) continue;

    edits.push(...ensureAtLeastOneBlankLineBefore(tokens, pair.openingIndex));

    const firstItemIndex = nextCodeIndex(tokens, pair.openingIndex);
    if (firstItemIndex !== undefined) edits.push(...capBlankLinesBefore(tokens, firstItemIndex, 0));
    edits.push(...capBlankLinesBefore(tokens, pair.closingIndex, 0));

    const afterCloseIndex = nextCodeIndex(tokens, pair.closingIndex);
    if (afterCloseIndex !== undefined) edits.push(...ensureAtLeastOneBlankLineBefore(tokens, afterCloseIndex));
  }

  let sawAnnotation = false;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.kind !== 'word') continue;
    if (isInsideAnyRange(skipRanges, token.offset)) {
      sawAnnotation = true;
      continue;
    }
    if (sawAnnotation && DEFINE_PHRASE_START.has(token.text.toUpperCase())) {
      edits.push(...ensureAtLeastOneBlankLineBefore(tokens, index));
      break;
    }
  }

  return applyEdits(sourceText, edits);
}
