// Ported from com/sap/adt/abapcleaner/rules/ddl/alignment/DdlAlignDataSourcesRule.java @ v1.29.0.
//
// Bounded subset: upstream aligns table names/aliases/`ON` conditions across a `SELECT FROM` clause
// plus all its `JOIN`s/`ASSOCIATION`s as ONE combined 5-column table (`KEYWORDS`, `TO_KEYWORDS`,
// `DATA_SOURCE`, `AS_ALIAS`, `ON_CONDITION`). This port drops the `KEYWORDS`/`TO_KEYWORDS` columns
// (the `JOIN`/`ASSOCIATION` keyword phrase itself) entirely — that phrase is ABSENT on the main
// `FROM` row (it's only ever present on a JOIN/ASSOCIATION row), making it a LEADING sparse column,
// which `align-helpers.ts`'s `alignColumnsWithOptionalCells` does not support (column 0 must be
// present in every row; see that file's header for why). Since `DDL_POSITION_JOIN`/
// `DDL_POSITION_ASSOCIATION` already position the keyword phrase itself, not aligning it into a
// shared column loses positioning value already covered elsewhere, only the (upstream, opt-in)
// cross-row keyword-column alignment. What remains — `DATA_SOURCE` (always present, so it's column
// 0), `AS_ALIAS` (sparse trailing), `ON_CONDITION` (sparse trailing, absent on the main `FROM` row)
// — fits the engine's constraints exactly. Upstream's `joinTrivialToColumn` heuristic (merging
// `TO_KEYWORDS` into the previous column when every association's cardinality is exactly `" TO"`) is
// not applicable here since that column doesn't exist in this port's model. Upstream's `minIndent`/
// `additionalIndent` cross-row leading-indent rewrite is not needed either — this port, like every
// other alignment rule here, never touches a row's own leading position, only pads gaps between
// already-existing cells.
//
// Recognized shape: a maximal run starting at each top-level (bracket-depth 0, outside any
// annotation) `FROM` keyword, comprising that `FROM`'s own data source plus every top-level `JOIN`/
// `ASSOCIATION` phrase (found via `position-join-association.ts`'s
// `findTopLevelJoinAndAssociationPhrases`) up to (not including) the next top-level `FROM` — this
// naturally scopes each run to one query, separating a `UNION`-ed sub-query's or a later CDS
// artifact's own `FROM`/`JOIN` chain from an earlier one without needing to specially recognize
// `UNION`/`{`/end-of-artifact as boundaries. A run of fewer than 2 data sources (a lone `FROM` with
// no `JOIN`/`ASSOCIATION`) is left untouched. Each row's `DATA_SOURCE` cell spans the data source
// name alone, or through a matching `)` if immediately followed by a parenthesized parameter list
// (`I_Entity( p1 : 1 )`, already left alone by this rule — parameter-list alignment is
// `DDL_ALIGN_SOURCE_PARAMETERS`'s job); `AS_ALIAS` is `[AS, alias]` if an `AS` immediately follows;
// `ON_CONDITION` (only possible on a `JOIN`/`ASSOCIATION` row, never the main `FROM` row) reuses
// `findOnIndex`/`conditionEndIndex` from `position-join-association.ts`. A run is refused entirely
// (left untouched) if any row's data source can't be parsed into this simple shape, matching every
// other bounded alignment rule in this port's "cancel the whole group rather than guess at one
// malformed row" convention. Critically, `AS_ALIAS`/`ON_CONDITION` are only ever included in a row
// if they sit on the SAME source line as the previous included cell in that row — this port's edit
// model pads a gap by REPLACING whatever sits between two cells with pure spaces, so padding across
// an existing line break (extremely common for `ON_CONDITION`, since `DDL_POSITION_JOIN`/
// `DDL_POSITION_ASSOCIATION` already force `ON` onto its own line) would destructively merge that
// line back onto the previous one. A cell excluded this way is simply left untouched at its existing
// position, not aligned — this is not a whole-run refusal, since the row's other, same-line cells
// can still be aligned normally.
//
// Transform: left-pads `DATA_SOURCE` so every row's `AS_ALIAS` (when present) lines up in a shared
// column, and left-pads through to `ON_CONDITION` (when present) similarly — reusing
// `alignColumnsWithOptionalCells` exactly as it's used elsewhere. Not implemented: the `JOIN`/
// `ASSOCIATION` keyword-column alignment (see above), `AlignAsAcrossJoins`/`AlignOnAcrossJoins`
// being independently toggleable (this port always aligns both together, when present), and
// anything upstream's `AlignTable`-per-nested-parenthesis-level machinery would additionally handle
// for a `FROM` clause containing its own nested parenthesized sub-`FROM`.
import { tokenize, findMatchingBracket, type Token } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange, type OffsetRange } from './annotation-ranges.js';
import { applyEdits, nextCodeIndex, type Edit } from './position-helpers.js';
import { findTopLevelJoinAndAssociationPhrases, findOnIndex, conditionEndIndex, type Phrase } from './position-join-association.js';
import { alignColumnsWithOptionalCells, type AlignSpan } from '../syntax/align-helpers.js';

export function alignDdlDataSources(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const skipRanges = annotationRanges(sourceText, tokens);

  const fromKeywords = findTopLevelFromKeywords(tokens, skipRanges);
  const joinPhrases = findTopLevelJoinAndAssociationPhrases(tokens, skipRanges);

  const edits: Edit[] = [];
  for (let i = 0; i < fromKeywords.length; i += 1) {
    const fromIndex = fromKeywords[i]!;
    const rangeEnd = fromKeywords[i + 1] ?? tokens.length;
    const dataSourceIndex = nextCodeIndex(tokens, fromIndex);
    if (dataSourceIndex === undefined || dataSourceIndex >= rangeEnd) continue;

    const phrasesInRange = joinPhrases.filter((phrase) => phrase.keywordIndex > fromIndex && phrase.keywordIndex < rangeEnd);
    const allPhrases: readonly (Phrase & { readonly isJoinOrAssociation: boolean })[] = [
      { keywordIndex: fromIndex, dataSourceIndex, isJoinOrAssociation: false },
      ...phrasesInRange.map((phrase) => ({ ...phrase, isJoinOrAssociation: true })),
    ];
    if (allPhrases.length < 2) continue;

    const rows = allPhrases.map((phrase) => buildRow(tokens, skipRanges, phrase));
    if (rows.some((row) => row === undefined)) continue;

    edits.push(...alignColumnsWithOptionalCells(rows as (readonly (AlignSpan | undefined)[])[]));
  }

  return applyEdits(sourceText, edits);
}

function findTopLevelFromKeywords(tokens: readonly Token[], skipRanges: readonly OffsetRange[]): number[] {
  const result: number[] = [];
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
    if (token.text.toUpperCase() === 'FROM') result.push(index);
  }
  return result;
}

function buildRow(
  tokens: readonly Token[],
  skipRanges: readonly OffsetRange[],
  phrase: Phrase & { readonly isJoinOrAssociation: boolean },
): readonly [AlignSpan, AlignSpan | undefined, AlignSpan | undefined] | undefined {
  const nameToken = tokens[phrase.dataSourceIndex]!;
  if (nameToken.kind !== 'word') return undefined;

  let dataSourceEnd = phrase.dataSourceIndex;
  const afterName = nextCodeIndex(tokens, phrase.dataSourceIndex);
  if (afterName !== undefined && tokens[afterName]!.text === '(') {
    const closeIndex = findMatchingBracket(tokens, afterName);
    if (closeIndex === undefined) return undefined;
    dataSourceEnd = closeIndex;
  }
  const dataSource: AlignSpan = { first: nameToken, last: tokens[dataSourceEnd]! };
  let lastIncludedLine = dataSource.last.line;

  let cursor = nextCodeIndex(tokens, dataSourceEnd);
  let asAlias: AlignSpan | undefined;
  if (cursor !== undefined && tokens[cursor]!.kind === 'word' && tokens[cursor]!.text.toUpperCase() === 'AS') {
    const aliasIndex = nextCodeIndex(tokens, cursor);
    if (aliasIndex === undefined || tokens[aliasIndex]!.kind !== 'word') return undefined;
    // column alignment only ever pads BETWEEN two cells on the same source line — an AS alias
    // already on its own separate line is left completely untouched rather than merged upward
    if (tokens[cursor]!.line === lastIncludedLine) {
      asAlias = { first: tokens[cursor]!, last: tokens[aliasIndex]! };
      lastIncludedLine = asAlias.last.line;
    }
    cursor = nextCodeIndex(tokens, aliasIndex);
  }

  let onCondition: AlignSpan | undefined;
  if (phrase.isJoinOrAssociation) {
    const onIndex = findOnIndex(tokens, dataSourceEnd);
    if (onIndex !== undefined && !isInsideAnyRange(skipRanges, tokens[onIndex]!.offset) && tokens[onIndex]!.line === lastIncludedLine) {
      const endIndex = conditionEndIndex(tokens, onIndex);
      onCondition = { first: tokens[onIndex]!, last: tokens[endIndex]! };
    }
  }

  return [dataSource, asAlias, onCondition];
}
