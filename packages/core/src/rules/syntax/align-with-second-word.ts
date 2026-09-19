// Ported from com/sap/adt/abapcleaner/rules/alignment/AlignWithSecondWordRule.java @ v1.29.0.
//
// Bounded subset: upstream recognizes almost every statement shape via a long, risky EXCLUDE list
// (`isDeclaration()`, `isAssignment()`, `isAbapSqlOperation()`, `isInClassDefinition()`, several
// `matchesOnSiblings` checks for CALL METHOD/FUNCTION/BADI, CREATE OBJECT, RECEIVE RESULTS FROM
// FUNCTION, two RAISE EXCEPTION shapes, and "opens a block except LOOP") — upstream's own source
// even leaves a `// TODO: or would it be better to use an include list?` comment acknowledging the
// alternative this port takes instead. This port recognizes only `READ`/`LOOP` as trigger keywords —
// both are unambiguously internal-table/loop operations in modern ABAP with no Open-SQL-statement
// homonym, unlike `INSERT`/`DELETE`/`MODIFY`/`EXPORT`/`IMPORT` (each can ALSO be a database
// operation this port has no reliable classifier to distinguish from the internal-table form, so
// they're deliberately excluded from the include list rather than merely deferred by oversight).
//
// Recognized shape: a Command whose first code token is `READ` or `LOOP`, whose second code token
// sits on the SAME source line as the first (e.g. `READ TABLE ...`, `LOOP AT ...` — matching
// upstream's own equally coarse "keyword + same-line second sibling" check, with no lexeme
// requirement on what that second token's text actually is, so this port also attempts alignment on
// `READ REPORT`/`READ TEXTPOOL`/`READ DATASET`-style statements exactly as upstream's real
// exclude-list-driven default would too). The target indent is that second token's own column. Every
// later code token that is (a) one of a small fixed CONTINUATION-keyword set — `WITH`, `INTO`,
// `ASSIGNING`, `WHERE` (the four shown in upstream's own `getExample()` for `READ TABLE`/`LOOP
// AT`-style continuations) — and (b) the first code token on its own source line, gets repositioned
// to that column via `breakBeforeWithIndent`; a leading-comment line directly above the continuation
// keyword does not block this (verified: `breakBeforeWithIndent` only refuses when the token is
// glued to a comment with no whitespace at all between them, not "a comment sits on the previous
// line" — the comment line itself is left untouched either way). `AND`/`OR`/`EQUIV` are never in the
// continuation-keyword set, so they're never
// repositioned, matching upstream's explicit exclusion of Boolean operators without needing a
// separate check for them.
//
// This port's tokenizer has no reserved-word table, so in principle a plain field/variable named
// `with`/`into`/`assigning`/`where` sitting in continuation position could be misidentified as a
// continuation keyword; because ABAP statement semantics are whitespace-insensitive, the only
// possible consequence is a harmless re-indent of that token, never a change in meaning. Not
// implemented: every trigger keyword beyond `READ`/`LOOP`, upstream's `isInMethod` gate (this port
// does not restrict to executable-block bodies), the pragma-adjacency check (`firstToken
// .getNextSibling() != firstToken.getNext()`), the `SUBMIT`-specific "align WITH with a previous
// WITH on the same line as SUBMIT" special case, and any continuation keyword beyond the fixed four.
import { parseAbapCommands, type Command } from '../../parser/commands.js';
import { applyEdits, breakBeforeWithIndent, type Edit } from '../ddl/position-helpers.js';

const TRIGGER_KEYWORDS = new Set(['READ', 'LOOP']);
const CONTINUATION_KEYWORDS = new Set(['WITH', 'INTO', 'ASSIGNING', 'WHERE']);

export function alignWithSecondWord(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const edits: Edit[] = [];
  for (const command of commands) edits.push(...processCommand(sourceText, command));
  return applyEdits(sourceText, edits);
}

function processCommand(sourceText: string, command: Command): readonly Edit[] {
  const code = command.tokens.filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
  if (code.length < 2) return [];
  const first = code[0]!;
  if (first.kind !== 'word' || !TRIGGER_KEYWORDS.has(first.text.toUpperCase())) return [];

  const second = code[1]!;
  if (second.line !== first.line) return [];

  const indent = columnOf(sourceText, second.offset);
  const edits: Edit[] = [];
  for (let index = 2; index < code.length; index += 1) {
    const token = code[index]!;
    if (token.kind !== 'word' || !CONTINUATION_KEYWORDS.has(token.text.toUpperCase())) continue;
    const prev = code[index - 1]!;
    if (prev.line === token.line) continue; // not the first code token on its own line

    const tokenIndex = command.tokens.indexOf(token);
    edits.push(...breakBeforeWithIndent(command.tokens, tokenIndex, indent));
  }
  return edits;
}

function columnOf(sourceText: string, offset: number): number {
  return offset - (sourceText.lastIndexOf('\n', offset - 1) + 1);
}
