// Ported from com/sap/adt/abapcleaner/rules/alignment/AlignSelectClausesRule.java,
// rulehelpers/SelectQuery.java, SelectClause.java @ v1.29.0.
//
// Bounded subset: upstream's `SelectQuery`/`SelectClause` classifier recognizes the full breadth of
// OpenSQL clause syntax (UNION/INTERSECT/EXCEPT query chains, subqueries, FOR ALL ENTRIES, %_HINTS,
// a "put a short FROM behind the SELECT list" heuristic, and width-driven one-liner
// creation/collapse) and repositions clauses accordingly. A first design pass assumed skipping the
// one-liner logic was a safe narrowing; verifying against the actual default config confirmed it
// is — `MainQueryOneLinerAction` defaults to `KEEP_EXISTING`, so upstream's own default NEVER
// creates a one-liner (an already single-line statement is left completely untouched, confirmed via
// upstream's own `testKeepOneLiners()`), and `SelectClauseIndent` defaults to `PLUS_2` (each clause
// keyword repositioned to `SELECT`'s own column + 2) — both exactly match what this port implements
// with no config surface. What upstream's default does NOT skip, and this port must therefore
// explicitly reproduce rather than ignore, is the "keep a simple FROM glued behind the SELECT list"
// branch: a `FROM` clause that already sits on `SELECT`'s own line with no `JOIN` in it is left
// completely untouched (never forced onto its own line) — only a `FROM` that already has a `JOIN`,
// or is already on its own line, gets its indent (re)corrected.
//
// Recognized shape: a `Command` matching `select-refusals.ts`'s `parseSimpleSelectCode` — the shared
// "simple, single-query, non-loop, already-multi-line SELECT statement" gate every `ALIGN_SELECT_*`
// rule in this family reuses verbatim (see that file's header for the exact refusal vocabulary:
// `SELECT ... ENDSELECT` loops, `FOR ALL ENTRIES`, `%_HINTS`, a second `SELECT` anywhere — which
// conservatively covers subqueries AND `UNION`/`INTERSECT`/`EXCEPT` chains in one check, since all
// three OpenSQL constructs upstream refuses individually syntactically require a second `SELECT`).
//
// For each of `FROM`, `WHERE`, `GROUP BY` (condensed onto one line if currently split), `HAVING`,
// `ORDER BY` (condensed), `INTO`, `APPENDING` found at bracket-depth 0 (skipping anything inside
// parentheses — safe since any parenthesized `SELECT` already refused the whole command above),
// forces a line break at `SELECT`'s column + 2, reusing `breakBeforeWithIndent`/`condensePhrase`/
// `applyEdits` from `ddl/position-helpers.ts` exactly as `align-clear-free.ts` already reuses this
// same "DDL" module for an ABAP rule (its token-scanning helpers are language-agnostic despite the
// directory). `GROUP`/`ORDER` only count as triggers when immediately followed by `BY` — this port's
// tokenizer has no reserved-word concept, so an unqualified bare "GROUP"/"ORDER" match could
// otherwise misfire on a field or alias literally named `group`/`order`. `breakBeforeWithIndent`
// itself already refuses to touch a keyword directly preceded by a comment token, so a clause
// keyword with a comment on the line above it is left alone for free, without needing its own check
// here. The `SELECT` line itself (`SELECT`/`SINGLE`/`DISTINCT`/the select list) is never touched —
// only breaks are forced before later clause keywords, matching the "leave the trigger line
// untouched" pattern this port's other alignment rules already establish. No column/value alignment
// of any kind is performed — this is purely a repositioning rule, architecturally identical to
// `DDL_POSITION_CLAUSES`/`DDL_POSITION_JOIN`, not `alignColumnsLeftAligned`'s job. Not implemented:
// UNION/INTERSECT/EXCEPT chains, subqueries, FOR ALL ENTRIES, %_HINTS, the SELECT...ENDSELECT loop
// form, one-liner creation/collapse, and any alignment within a clause body (a multi-line WHERE
// condition's own AND/OR structure is `ALIGN_LOGICAL_EXPRESSIONS`'s job, matching upstream's own
// division of labor between the two rules).
import { parseAbapCommands, type Command } from '../../parser/commands.js';
import type { Token } from '../../parser/tokenizer.js';
import { applyEdits, breakBeforeWithIndent, condensePhrase, type Edit } from '../ddl/position-helpers.js';
import { parseSimpleSelectCode } from './select-refusals.js';

const SIMPLE_CLAUSE_KEYWORDS = new Set(['FROM', 'WHERE', 'HAVING', 'INTO', 'APPENDING']);
const COMPOUND_CLAUSE_KEYWORDS = new Set(['GROUP', 'ORDER']);

export function alignSelectClauses(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const edits: Edit[] = [];
  for (const command of commands) edits.push(...processSelectCommand(sourceText, command));
  return applyEdits(sourceText, edits);
}

function processSelectCommand(sourceText: string, command: Command): readonly Edit[] {
  const code = parseSimpleSelectCode(command);
  if (code === undefined) return [];
  const selectToken = code[0]!;

  const clauses = findClauseKeywords(code);
  if (clauses.length === 0) return [];

  const indent = columnOf(sourceText, selectToken.offset) + 2;
  const fromClause = clauses.find((clause) => clause.keyword === 'FROM');
  const skipFrom = fromClause !== undefined && fromClause.startToken.line === selectToken.line && !hasJoinBefore(code, fromClause, clauses);

  const edits: Edit[] = [];
  for (const clause of clauses) {
    if (clause === fromClause && skipFrom) continue;
    const index = command.tokens.indexOf(clause.startToken);
    edits.push(...breakBeforeWithIndent(command.tokens, index, indent));
    if (clause.byToken !== undefined) {
      edits.push(...condensePhrase(command.tokens, index, command.tokens.indexOf(clause.byToken)));
    }
  }
  return edits;
}

interface ClauseKeyword {
  readonly keyword: string;
  readonly startToken: Token;
  readonly byToken: Token | undefined;
  readonly codeIndex: number;
}

function findClauseKeywords(code: readonly Token[]): readonly ClauseKeyword[] {
  const clauses: ClauseKeyword[] = [];
  let depth = 0;
  for (let index = 1; index < code.length - 1; index += 1) {
    const token = code[index]!;
    if (token.kind === 'punctuation' && '([{'.includes(token.text)) {
      depth += 1;
      continue;
    }
    if (token.kind === 'punctuation' && ')]}'.includes(token.text)) {
      depth -= 1;
      continue;
    }
    if (depth !== 0 || token.kind !== 'word') continue;

    const upper = token.text.toUpperCase();
    if (COMPOUND_CLAUSE_KEYWORDS.has(upper)) {
      const next = code[index + 1];
      if (next?.kind === 'word' && next.text.toUpperCase() === 'BY') {
        clauses.push({ keyword: upper, startToken: token, byToken: next, codeIndex: index });
      }
      continue;
    }
    if (SIMPLE_CLAUSE_KEYWORDS.has(upper)) {
      clauses.push({ keyword: upper, startToken: token, byToken: undefined, codeIndex: index });
    }
  }
  return clauses;
}

function hasJoinBefore(code: readonly Token[], fromClause: ClauseKeyword, clauses: readonly ClauseKeyword[]): boolean {
  const fromIndex = clauses.indexOf(fromClause);
  const nextClause = clauses[fromIndex + 1];
  const endIndex = nextClause === undefined ? code.length - 1 : nextClause.codeIndex;
  for (let index = fromClause.codeIndex + 1; index < endIndex; index += 1) {
    const token = code[index]!;
    if (token.kind === 'word' && token.text.toUpperCase() === 'JOIN') return true;
  }
  return false;
}

function columnOf(sourceText: string, offset: number): number {
  return offset - (sourceText.lastIndexOf('\n', offset - 1) + 1);
}
