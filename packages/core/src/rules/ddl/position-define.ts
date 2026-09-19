// Ported from com/sap/adt/abapcleaner/rules/ddl/position/DdlPositionDefineRule.java @ v1.29.0
//
// Bounded subset: breaks before the file's first top-level DEFINE/EXTEND/ANNOTATE keyword at
// indent 0 (matching the upstream rule's `BreakBeforeDefine` = ALWAYS, `DefineIndent` = 0
// defaults) and condenses the following structural-keyword phrase (DEFINE/EXTEND/ANNOTATE/VIEW/
// ENTITY/TABLE/FUNCTION/HIERARCHY/TRANSIENT/ABSTRACT/CUSTOM/STRUCTURE/ROOT, via a fixed keyword
// list rather than upstream's `getDdlOrDclEntityNameToken()` pattern matcher) up to the entity
// name, onto one line. Also breaks before any top-level "WITH PARAMETERS" at indent 2 (matching
// `BreakBeforeWithParams` = ALWAYS, `WithParamsIndent` = 2) and condenses that phrase; a "WITH" not
// immediately followed by "PARAMETERS" (e.g. "WITH DEFAULT FILTER") is left untouched. Does not
// implement: joining an already-broken entity name onto the DEFINE line (`BreakBeforeEntityName` =
// NEVER by default), inserting a blank line between trailing annotations and DEFINE/EXTEND/ANNOTATE
// when one doesn't already exist, re-indenting each parameter of a WITH PARAMETERS (...) list, or
// `[DEFINE] ROLE|ACCESSPOLICY` declarations (a DCL-specific pattern) — all need either
// command-tree infrastructure this port does not have, or a full entity-name pattern matcher this
// bounded keyword-list approach deliberately avoids.
import { tokenize } from '../../parser/tokenizer.js';
import { annotationRanges, isInsideAnyRange } from './annotation-ranges.js';
import { applyEdits, breakBeforeWithIndent, condensePhrase, nextCodeIndex, nextCodeWordIs, type Edit } from './position-helpers.js';

const DEFINE_PHRASE_KEYWORDS = new Set([
  'DEFINE', 'EXTEND', 'ANNOTATE', 'VIEW', 'ENTITY', 'TABLE', 'FUNCTION', 'HIERARCHY',
  'TRANSIENT', 'ABSTRACT', 'CUSTOM', 'STRUCTURE', 'ROOT',
]);

export function normalizeDdlPositionDefine(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const skipRanges = annotationRanges(sourceText, tokens);
  const edits: Edit[] = [];

  let depth = 0;
  let handledDefinePhrase = false;
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
    if (!handledDefinePhrase && (upper === 'DEFINE' || upper === 'EXTEND' || upper === 'ANNOTATE')) {
      handledDefinePhrase = true;
      edits.push(...breakBeforeWithIndent(tokens, index, 0));
      const entityNameIndex = findEntityNameIndex(tokens, index);
      if (entityNameIndex !== undefined) edits.push(...condensePhrase(tokens, index, entityNameIndex));
    } else if (upper === 'WITH' && nextCodeWordIs(tokens, index, 'PARAMETERS')) {
      const parametersIndex = nextCodeIndex(tokens, index)!;
      edits.push(...breakBeforeWithIndent(tokens, index, 2), ...condensePhrase(tokens, index, parametersIndex));
    }
  }

  return applyEdits(sourceText, edits);
}

function findEntityNameIndex(tokens: ReturnType<typeof tokenize>, defineIndex: number): number | undefined {
  let cursor = defineIndex;
  for (;;) {
    const next = nextCodeIndex(tokens, cursor);
    if (next === undefined || tokens[next]!.kind !== 'word') return undefined;
    if (!DEFINE_PHRASE_KEYWORDS.has(tokens[next]!.text.toUpperCase())) return next;
    cursor = next;
  }
}
