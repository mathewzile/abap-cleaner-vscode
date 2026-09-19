// Ported from com/sap/adt/abapcleaner/rules/ddl/position/DdlPositionClausesRule.java @ v1.29.0
//
// Bounded subset: for each top-level (bracket-depth 0, outside any annotation) WHERE, HAVING,
// GROUP BY, UNION [ALL], INTERSECT, and EXCEPT clause keyword, enforces a line break with no
// indent before it (matching the upstream rule's `BreakBeforeWhereEtc`/`BreakBeforeUnionEtc` =
// ALWAYS and `*Indent` = 0 defaults) and condenses a two-word keyword phrase ("GROUP BY",
// "UNION ALL") onto one line with a single separating space. Does not implement: forcing an extra
// blank line before UNION/INTERSECT/EXCEPT unless already preceded by the select list's closing
// brace, or re-indenting the continuation lines of a multi-line condition after its keyword moves
// — both need command-tree infrastructure (`isAfterSelectList`, `command.addIndent`) this port
// does not have; existing blank lines and continuation-line indentation are left untouched.
import { tokenize } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange } from './annotation-ranges.js';
import { applyEdits, breakBeforeWithIndent, condensePhrase, nextCodeIndex, nextCodeWordIs, type Edit } from './position-helpers.js';

const SINGLE_KEYWORD_CLAUSES = new Set(['WHERE', 'HAVING', 'INTERSECT', 'EXCEPT']);

export function normalizeDdlPositionClauses(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const skipRanges = annotationRanges(sourceText, tokens);
  const edits: Edit[] = [];

  let depth = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.kind === 'punctuation' && '([{'.includes(token.text)) {
      depth += 1;
      continue;
    }
    if (token.kind === 'punctuation' && ')]}'.includes(token.text)) {
      depth -= 1;
      continue;
    }
    if (depth !== 0 || token.kind !== 'word' || isInsideAnyRange(skipRanges, token.offset)) continue;

    const upper = token.text.toUpperCase();
    if (SINGLE_KEYWORD_CLAUSES.has(upper)) {
      edits.push(...breakBeforeWithIndent(tokens, index, 0));
    } else if (upper === 'GROUP' && nextCodeWordIs(tokens, index, 'BY')) {
      const byIndex = nextCodeIndex(tokens, index)!;
      edits.push(...breakBeforeWithIndent(tokens, index, 0), ...condensePhrase(tokens, index, byIndex));
      index = byIndex;
    } else if (upper === 'UNION') {
      edits.push(...breakBeforeWithIndent(tokens, index, 0));
      if (nextCodeWordIs(tokens, index, 'ALL')) {
        const allIndex = nextCodeIndex(tokens, index)!;
        edits.push(...condensePhrase(tokens, index, allIndex));
        index = allIndex;
      }
    }
  }

  return applyEdits(sourceText, edits);
}
