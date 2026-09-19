// Ported from com/sap/adt/abapcleaner/rules/ddl/position/DdlPositionJoinRule.java and
// DdlPositionAssociationRule.java (sharing RuleForDdlPositionJoinOrAssociation.java) @ v1.29.0
//
// Bounded subset: for each top-level (bracket-depth 0, outside any annotation) JOIN or ASSOCIATION
// keyword phrase, enforces a line break with indent 4 (JOIN) or 2 (ASSOCIATION) before the phrase's
// leading keyword (matching `BreakBeforeKeywords` = ALWAYS) and condenses the phrase (through any
// cardinality keywords/brackets) onto one line. The keyword/cardinality vocabulary recognized while
// scanning a phrase (`INNER`/`LEFT`/`RIGHT`/`CROSS`/`OUTER`/`EXACT`/`ONE`/`MANY`/`TO` before `JOIN`;
// `OF`/`TO`/`ONE`/`MANY`/`EXACT`/a `[card]` bracket after `ASSOCIATION`/`COMPOSITION`/
// `REDEFINE ASSOCIATION`) is a fixed whitelist rather than upstream's real keyword table, so an
// unrecognized token during the scan makes the whole phrase unrecognized (skipped) rather than
// misread.
//
// Matching `BreakBeforeCondition` = `IF_MULTI_LINE_FOUND` (the default for both rules) needs
// upstream's whole-file `prepare()` pre-scan: this is reproduced as an explicit first pass over the
// whole token stream that finds every top-level JOIN's (or every top-level ASSOCIATION's) `ON`
// condition span and sets one shared boolean if any of them already contains a line break; a second
// pass then forces a break before every JOIN's (or every ASSOCIATION's) `ON` at indent 6 (JOIN) or 4
// (ASSOCIATION) if that boolean is true. If it is false, the `ON` token's existing line break state
// is left untouched rather than actively removed, since this port's edit helpers only ever add or
// adjust a break, never join two lines back together — a deliberate narrowing of upstream's `NEVER`
// branch, which does actively re-join.
//
// Not implemented: the `WITH DEFAULT FILTER`/`FILTER` clause (`BreakBeforeFilter`, ASSOCIATION
// only), breaking before the data source (`NEVER` by default, so already a no-op), the
// `hasParameters` contribution to the multi-line-condition scan, and re-indenting the ON
// condition's continuation lines by the same delta the `ON` keyword moved
// (`command.addIndent(...)`) — a multi-line condition's `AND ...` lines keep their existing column
// after this rule moves `ON` to a new indent.
import { tokenize, type Token } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange } from './annotation-ranges.js';
import { applyEdits, breakBeforeWithIndent, condensePhrase, nextCodeIndex, type Edit } from './position-helpers.js';

const JOIN_PHRASE_KEYWORDS = new Set(['INNER', 'LEFT', 'RIGHT', 'CROSS', 'OUTER', 'EXACT', 'ONE', 'MANY', 'TO']);
const ASSOCIATION_PHRASE_KEYWORDS = new Set(['OF', 'TO', 'ONE', 'MANY', 'EXACT']);
const CONDITION_BOUNDARY_KEYWORDS = new Set(['WHERE', 'HAVING', 'GROUP', 'UNION', 'INTERSECT', 'EXCEPT', 'WITH', 'FILTER']);

export interface Phrase {
  readonly keywordIndex: number;
  readonly dataSourceIndex: number;
}

export function normalizeDdlPositionJoin(sourceText: string): string {
  return normalize(sourceText, scanJoinPhrase, 4, 6);
}

export function normalizeDdlPositionAssociation(sourceText: string): string {
  return normalize(sourceText, scanAssociationPhrase, 2, 4);
}

function normalize(
  sourceText: string,
  scanPhrase: (tokens: readonly Token[], index: number) => Phrase | undefined,
  keywordIndent: number,
  conditionIndent: number,
): string {
  const tokens = tokenize(sourceText, 'DDL');
  const skipRanges = annotationRanges(sourceText, tokens);
  const phrases = findTopLevelPhrases(tokens, skipRanges, scanPhrase);
  if (phrases.length === 0) return sourceText;

  const anyMultiLineCondition = phrases.some((phrase) => hasMultiLineCondition(sourceText, tokens, phrase));

  const edits: Edit[] = [];
  for (const phrase of phrases) {
    edits.push(...breakBeforeWithIndent(tokens, phrase.keywordIndex, keywordIndent));
    edits.push(...condensePhrase(tokens, phrase.keywordIndex, phrase.dataSourceIndex));
    const onIndex = findOnIndex(tokens, phrase.dataSourceIndex);
    if (onIndex !== undefined && anyMultiLineCondition) {
      edits.push(...breakBeforeWithIndent(tokens, onIndex, conditionIndent));
    }
  }
  return applyEdits(sourceText, edits);
}

export function findTopLevelJoinAndAssociationPhrases(
  tokens: readonly Token[],
  skipRanges: readonly { readonly start: number; readonly end: number }[],
): readonly Phrase[] {
  return [...findTopLevelPhrases(tokens, skipRanges, scanJoinPhrase), ...findTopLevelPhrases(tokens, skipRanges, scanAssociationPhrase)]
    .sort((a, b) => a.keywordIndex - b.keywordIndex);
}

function findTopLevelPhrases(
  tokens: readonly Token[],
  skipRanges: readonly { readonly start: number; readonly end: number }[],
  scanPhrase: (tokens: readonly Token[], index: number) => Phrase | undefined,
): readonly Phrase[] {
  const phrases: Phrase[] = [];
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
    const phrase = scanPhrase(tokens, index);
    if (phrase !== undefined) {
      phrases.push(phrase);
      index = phrase.dataSourceIndex; // skip past the whole matched phrase so its interior keywords are never rescanned as a new phrase start
    }
  }
  return phrases;
}

function scanJoinPhrase(tokens: readonly Token[], startIndex: number): Phrase | undefined {
  let cursor: number | undefined = startIndex;
  while (cursor !== undefined) {
    const token = tokens[cursor]!;
    if (token.kind !== 'word') return undefined;
    const upper = token.text.toUpperCase();
    if (upper === 'JOIN') {
      const dataSourceIndex = nextCodeIndex(tokens, cursor);
      return dataSourceIndex === undefined ? undefined : { keywordIndex: startIndex, dataSourceIndex };
    }
    if (!JOIN_PHRASE_KEYWORDS.has(upper)) return undefined;
    cursor = nextCodeIndex(tokens, cursor);
  }
  return undefined;
}

function scanAssociationPhrase(tokens: readonly Token[], startIndex: number): Phrase | undefined {
  const first = tokens[startIndex]!;
  const firstUpper = first.text.toUpperCase();
  let cursor: number | undefined;
  if (firstUpper === 'ASSOCIATION' || firstUpper === 'COMPOSITION') {
    cursor = nextCodeIndex(tokens, startIndex);
  } else if (firstUpper === 'REDEFINE') {
    const afterRedefine = nextCodeIndex(tokens, startIndex);
    if (afterRedefine === undefined || tokens[afterRedefine]!.kind !== 'word' || tokens[afterRedefine]!.text.toUpperCase() !== 'ASSOCIATION') return undefined;
    cursor = nextCodeIndex(tokens, afterRedefine);
  } else {
    return undefined;
  }

  while (cursor !== undefined) {
    const token = tokens[cursor]!;
    if (token.kind === 'punctuation' && token.text === '[') {
      const closingIndex = matchingBracketIndex(tokens, cursor);
      if (closingIndex === undefined) return undefined;
      cursor = codeIndexAtOrAfter(tokens, closingIndex + 1);
      continue;
    }
    if (token.kind === 'word' && ASSOCIATION_PHRASE_KEYWORDS.has(token.text.toUpperCase())) {
      cursor = nextCodeIndex(tokens, cursor);
      continue;
    }
    break;
  }
  return cursor === undefined ? undefined : { keywordIndex: startIndex, dataSourceIndex: cursor };
}

function matchingBracketIndex(tokens: readonly Token[], openingIndex: number): number | undefined {
  let depth = 1;
  for (let index = openingIndex + 1; index < tokens.length; index += 1) {
    if (tokens[index]!.text === '[') depth += 1;
    else if (tokens[index]!.text === ']') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return undefined;
}

function codeIndexAtOrAfter(tokens: readonly Token[], fromIndex: number): number | undefined {
  for (let index = fromIndex; index < tokens.length; index += 1) {
    if (tokens[index]!.kind !== 'whitespace' && tokens[index]!.kind !== 'comment') return index;
  }
  return undefined;
}

export function findOnIndex(tokens: readonly Token[], fromIndex: number): number | undefined {
  let cursor: number | undefined = fromIndex;
  while (cursor !== undefined) {
    const token = tokens[cursor]!;
    if (isConditionBoundary(tokens, cursor)) return undefined;
    if (token.kind === 'word' && token.text.toUpperCase() === 'ON') return cursor;
    cursor = nextCodeIndex(tokens, cursor);
  }
  return undefined;
}

export function conditionEndIndex(tokens: readonly Token[], onIndex: number): number {
  let cursor = nextCodeIndex(tokens, onIndex);
  let lastCode = onIndex;
  while (cursor !== undefined && !isConditionBoundary(tokens, cursor)) {
    lastCode = cursor;
    cursor = nextCodeIndex(tokens, cursor);
  }
  return lastCode;
}

function isConditionBoundary(tokens: readonly Token[], index: number): boolean {
  const token = tokens[index]!;
  if (token.kind === 'punctuation' && (token.text === '{' || token.text === '}')) return true;
  if (token.kind !== 'word') return false;
  const upper = token.text.toUpperCase();
  return CONDITION_BOUNDARY_KEYWORDS.has(upper) || scanJoinPhrase(tokens, index) !== undefined || scanAssociationPhrase(tokens, index) !== undefined;
}

function hasMultiLineCondition(sourceText: string, tokens: readonly Token[], phrase: Phrase): boolean {
  const onIndex = findOnIndex(tokens, phrase.dataSourceIndex);
  if (onIndex === undefined) return false;
  const endIndex = conditionEndIndex(tokens, onIndex);
  const start = tokens[onIndex]!.offset;
  const end = tokens[endIndex]!.offset + tokens[endIndex]!.text.length;
  return sourceText.slice(start, end).includes('\n');
}
