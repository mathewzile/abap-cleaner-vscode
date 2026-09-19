// Ported from com/sap/adt/abapcleaner/rules/ddl/position/DdlPositionSelectRule.java @ v1.29.0
//
// Bounded subset: for each top-level (bracket-depth 0, outside any annotation) "AS SELECT
// [DISTINCT] FROM", "AS PROJECTION ON", and "{EXCEPT|INTERSECT|UNION [ALL]} SELECT [DISTINCT]
// FROM" keyword phrase, enforces a line break with indent 2 before the phrase's leading keyword
// (matching the upstream rule's `BreakBefore*` = ALWAYS and `*Indent` = 2 defaults) and condenses
// the phrase onto one line. An "AS" is only ever treated as the start of one of these phrases when
// immediately followed by SELECT/PROJECTION, which a data source or field alias's target
// identifier can never be (both are reserved DDL keywords), so this cannot misfire on an ordinary
// "... as AnyAlias". Does not implement: breaking/indenting the data source after FROM (`NEVER` by
// default, so a no-op), or adding an extra blank line when the phrase immediately follows an
// entity's own `WITH PARAMETERS (...)` — both need command-tree infrastructure this port does not
// have; existing blank lines are left untouched.
import { tokenize } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange } from './annotation-ranges.js';
import { applyEdits, breakBeforeWithIndent, condensePhrase, nextCodeIndex, nextCodeWordIs, prevCodeIndex, type Edit } from './position-helpers.js';

const INDENT = 2;

export function normalizeDdlPositionSelect(sourceText: string): string {
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
    if (upper === 'AS') {
      const asSelectFromEnd = matchAsSelectFrom(tokens, index);
      if (asSelectFromEnd !== undefined) {
        edits.push(...breakBeforeWithIndent(tokens, index, INDENT), ...condensePhrase(tokens, index, asSelectFromEnd));
        continue;
      }
      const asProjectionOnEnd = matchAsProjectionOn(tokens, index);
      if (asProjectionOnEnd !== undefined) {
        edits.push(...breakBeforeWithIndent(tokens, index, INDENT), ...condensePhrase(tokens, index, asProjectionOnEnd));
      }
    } else if (upper === 'SELECT' && isAfterUnionEtc(tokens, index)) {
      edits.push(...breakBeforeWithIndent(tokens, index, INDENT));
      const fromIndex = matchSelectFrom(tokens, index);
      if (fromIndex !== undefined) edits.push(...condensePhrase(tokens, index, fromIndex));
    }
  }

  return applyEdits(sourceText, edits);
}

function matchAsSelectFrom(tokens: ReturnType<typeof tokenize>, asIndex: number): number | undefined {
  if (!nextCodeWordIs(tokens, asIndex, 'SELECT')) return undefined;
  return matchSelectFrom(tokens, nextCodeIndex(tokens, asIndex)!);
}

function matchSelectFrom(tokens: ReturnType<typeof tokenize>, selectIndex: number): number | undefined {
  let cursor = selectIndex;
  if (nextCodeWordIs(tokens, cursor, 'DISTINCT')) cursor = nextCodeIndex(tokens, cursor)!;
  if (!nextCodeWordIs(tokens, cursor, 'FROM')) return undefined;
  return nextCodeIndex(tokens, cursor)!;
}

function matchAsProjectionOn(tokens: ReturnType<typeof tokenize>, asIndex: number): number | undefined {
  if (!nextCodeWordIs(tokens, asIndex, 'PROJECTION')) return undefined;
  const projectionIndex = nextCodeIndex(tokens, asIndex)!;
  if (!nextCodeWordIs(tokens, projectionIndex, 'ON')) return undefined;
  return nextCodeIndex(tokens, projectionIndex)!;
}

function isAfterUnionEtc(tokens: ReturnType<typeof tokenize>, selectIndex: number): boolean {
  const prevIndex = prevCodeIndex(tokens, selectIndex);
  const prevWord = wordAt(tokens, prevIndex);
  if (prevWord === 'UNION' || prevWord === 'INTERSECT' || prevWord === 'EXCEPT') return true;
  if (prevWord !== 'ALL') return false;
  return wordAt(tokens, prevIndex === undefined ? undefined : prevCodeIndex(tokens, prevIndex)) === 'UNION';
}

function wordAt(tokens: ReturnType<typeof tokenize>, index: number | undefined): string | undefined {
  if (index === undefined || tokens[index]!.kind !== 'word') return undefined;
  return tokens[index]!.text.toUpperCase();
}
