// Ported from com/sap/adt/abapcleaner/rules/ddl/spaces/DdlTypoRule.java @ v1.29.0
//
// Bounded subset: applies the same narrowly-provable typo-correction table used by the ABAP
// `TYPO` rule (`rules/syntax/typo.ts`) to DDL/DCL `//`, `--`, and `/* ... */` comment tokens only.
// Does not implement `ProcessAnnotations`/`ProcessAnnotationRefs` (inserting a new TODO comment
// line above an annotation value with a suspected spelling issue — a structural insertion, not a
// token-text rewrite) or `ConvertBritishToAmerican`, since both need the upstream
// `CommentIdentifier`'s full English-detection and British/American conversion tables this port
// does not have.
import { tokenize } from '../../parser/tokenizer.js';
import { correctTypoWords } from '../syntax/typo.js';

export function correctDdlCommentTypos(sourceText: string): string {
  return tokenize(sourceText, 'DDL').map((token) => token.kind === 'comment' ? correctTypoWords(token.text) : token.text).join('');
}
