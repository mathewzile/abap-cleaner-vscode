// Ported from com/sap/adt/abapcleaner/rules/ddl/position/DdlPositionBracesRule.java @ v1.29.0
//
// Bounded subset: for each top-level select-list brace pair (skipping any `{ }` inside an
// annotation value, matching Java's `isDdlAnnotation()` guard via the shared `annotation-ranges.ts`
// helper), enforces a line break with no leading indent before the opening `{` and before the
// closing `}`, matching the upstream rule's `BreakBeforeOpeningBrace`/`BreakBeforeClosingBrace` =
// ALWAYS and `*Indent` = 0 defaults. Existing blank lines before a brace are preserved; only the
// final line's indentation is normalized. Configurable break modes/indents and the legacy
// brace-less `SELECT ... FROM` syntax (with its own `BreakBeforeFrom` setting) are not handled,
// since telling that syntax apart from a regular select list needs the DDL command-boundary
// classification this port does not have yet. A brace immediately preceded by a comment is left
// untouched, since inserting a break there safely would need comment-attachment rules this bounded
// subset does not implement.
import { tokenize, findBracketPairs } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange } from './annotation-ranges.js';
import { applyEdits, breakBeforeWithIndent } from './position-helpers.js';

export function normalizeDdlPositionBraces(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const skipRanges = annotationRanges(sourceText, tokens);
  const edits = findBracketPairs(tokens).flatMap((pair) => {
    if (tokens[pair.openingIndex]!.text !== '{') return [];
    if (isInsideAnyRange(skipRanges, tokens[pair.openingIndex]!.offset)) return [];
    return [...breakBeforeWithIndent(tokens, pair.openingIndex, 0), ...breakBeforeWithIndent(tokens, pair.closingIndex, 0)];
  });

  return applyEdits(sourceText, edits);
}
