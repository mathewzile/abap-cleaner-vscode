// Ported from com/sap/adt/abapcleaner/rulehelpers/LogicalExpression.java, TreeAlign.java,
// TreeAlignColumn.java @ v1.29.0, as used by
// com/sap/adt/abapcleaner/rules/ddl/alignment/DdlAlignLogicalExpressionsRule.java.
//
// Bounded subset: the DDL twin of `ALIGN_LOGICAL_EXPRESSIONS` (see that file's header comment for
// the full rationale on the flat-chain/single-token/uniform-operator/uniform-joiner bounded shape,
// shared verbatim via `syntax/logical-chain.ts`'s `parseConditionChain`). Finds each top-level
// JOIN's/ASSOCIATION's `ON` condition (reusing `position-join-association.ts`'s phrase/condition-span
// scanning — the same boundary detection `WHERE`/`HAVING`/`GROUP`/`UNION`/`INTERSECT`/`EXCEPT`/
// `WITH`/`FILTER`/`{`/`}`/a nested `JOIN`/`ASSOCIATION` phrase already used by `DDL_POSITION_JOIN`/
// `DDL_POSITION_ASSOCIATION` to know where one condition ends), and aligns its `AND`/`OR`
// continuation lines the same way. `WHERE`/`HAVING`/`WHEN`/path-expression-filter conditions (also
// handled by upstream's rule) are not recognized by this port — only `JOIN`/`ASSOCIATION` `ON`.
//
// Unlike ABAP's `IF`/`ELSEIF`/`CHECK`/`WHILE` (upstream default `AlignStyle.DO_NOT_ALIGN`), upstream's
// actual default for DDL `ON` is `AlignStyle.LEFT_ALIGN` (`configAlignOnWithBoolOps`). The two
// coincide for this bounded, paren-free flat-chain shape — `TreeAlign.align()`'s bracket-repositioning
// branch, the only thing that would make `DO_NOT_ALIGN` and `LEFT_ALIGN` diverge, never triggers
// without a `NOT`/parenthesis column to reposition — so this port's "leave the `ON` line untouched,
// align only the `AND`/`OR` continuation lines against each other" behavior is a faithful match for
// this shape specifically, not a misreading of which style is the real default.
import { tokenize, type Token } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange } from './annotation-ranges.js';
import { applyEdits, nextCodeIndex, type Edit } from './position-helpers.js';
import { findTopLevelJoinAndAssociationPhrases, findOnIndex, conditionEndIndex } from './position-join-association.js';
import { alignColumnsLeftAligned } from '../syntax/align-helpers.js';
import { parseConditionChain } from '../syntax/logical-chain.js';

export function alignDdlLogicalExpressions(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const skipRanges = annotationRanges(sourceText, tokens);
  const phrases = findTopLevelJoinAndAssociationPhrases(tokens, skipRanges);

  const edits: Edit[] = [];
  for (const phrase of phrases) {
    const onIndex = findOnIndex(tokens, phrase.dataSourceIndex);
    if (onIndex === undefined) continue;
    const endIndex = conditionEndIndex(tokens, onIndex);

    const bodyStart = nextCodeIndex(tokens, onIndex);
    if (bodyStart === undefined || bodyStart > endIndex) continue;
    const body = codeTokensBetween(tokens, skipRanges, bodyStart, endIndex);

    const conditions = parseConditionChain(body);
    if (conditions === undefined || conditions.length < 2) continue;
    const continuationRows = conditions.slice(1).map((condition) => [condition.lhs, condition.op, condition.rhs] as const);
    edits.push(...alignColumnsLeftAligned(continuationRows));
  }

  return applyEdits(sourceText, edits);
}

function codeTokensBetween(
  tokens: readonly Token[],
  skipRanges: readonly { readonly start: number; readonly end: number }[],
  fromIndex: number,
  toIndex: number,
): readonly Token[] {
  const code: Token[] = [];
  for (let index = fromIndex; index <= toIndex; index += 1) {
    const token = tokens[index]!;
    if (token.kind === 'whitespace' || token.kind === 'comment') continue;
    if (isInsideAnyRange(skipRanges, token.offset)) continue;
    code.push(token);
  }
  return code;
}
