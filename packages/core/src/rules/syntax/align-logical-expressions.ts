// Ported from com/sap/adt/abapcleaner/rulehelpers/LogicalExpression.java, TreeAlign.java,
// TreeAlignColumn.java @ v1.29.0, as used by
// com/sap/adt/abapcleaner/rules/alignment/AlignLogicalExpressionsRule.java.
//
// Bounded subset: upstream builds a full recursive operator-precedence tree (AND/OR/EQUIV/NOT,
// parenthesized sub-expressions, predicate expressions like `IS INITIAL`/`IS BOUND`/`IN`/`BETWEEN`)
// and a tree-aware column-matching layout algorithm (`TreeAlign`). This port instead recognizes and
// aligns only a *flat* chain of comparisons after a trigger keyword (`IF`/`ELSEIF`/`CHECK`/`WHILE`
// at the start of a Command — `WHERE`/`ON`/`HAVING`/`WHEN`/SQL contexts are not recognized, since
// this port has no SQL-clause classifier): `<keyword> <lhs1> <op> <rhs1> (AND|OR) <lhs2> <op> <rhs2>
// (AND|OR) ...`, where every joining keyword is the SAME (all `AND` or all `OR` — `EQUIV`, and any
// mix of `AND`/`OR`, refuses), every comparison uses the SAME single symbolic operator text (`=`,
// `<>`, `<`, `>`, `<=`, `>=` only — ABAP's keyword-style `EQ`/`NE`/`LT`/`GT`/`LE`/`GE` are not
// recognized, and a chain mixing operator text, e.g. `=` with `<>`, refuses rather than risk
// misaligning: upstream's default right-aligns the comparison-operator column, which this port's
// left-align-only engine can only reproduce exactly when every operator in the chain has identical
// width), and every LHS/RHS is exactly one token (so `NOT`, parentheses, and predicate expressions
// like `IS INITIAL` all fail to match the 3-token `<lhs> <op> <rhs>` shape and refuse naturally,
// without needing a separate exclusion check). At least one `AND`/`OR` continuation must exist (a
// lone condition has nothing to align against) and each continuation condition must start on its own
// source line, distinct from both the immediately preceding condition's line and (transitively) every
// other condition's line — two conditions crammed onto one physical line are left untouched, since
// alignment is inherently a vertical/cross-line concept, matching every other "consecutive run"
// `ALIGN_*` rule in this port. The triggering keyword's own line (i.e. the first condition) is left
// completely untouched, matching upstream's `AlignStyle.DO_NOT_ALIGN` — the shared default for
// `IF`/`ELSEIF`/`CHECK`/`WHILE` — which for a paren-free flat chain like this produces output
// identical to `LEFT_ALIGN` too (`TreeAlign`'s bracket-repositioning branch, the only thing that
// would make the two styles diverge, never triggers without a `NOT`/parenthesis column to move).
// Repositioning/aligning the trigger keyword's own line, right-aligning the comparison-operator
// column, and the `maxInnerSpaces`/`onlyAlignSameObjects` config knobs are not implemented.
import { parseAbapCommands, type Command } from '../../parser/commands.js';
import { alignColumnsLeftAligned } from './align-helpers.js';
import { parseConditionChain } from './logical-chain.js';

const TRIGGER_KEYWORDS = new Set(['IF', 'ELSEIF', 'CHECK', 'WHILE']);

interface Edit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export function alignLogicalExpressions(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const edits: Edit[] = [];
  for (const command of commands) {
    const conditions = parseTriggeredChain(command);
    if (conditions === undefined || conditions.length < 2) continue;
    const continuationRows = conditions.slice(1).map((condition) => [condition.lhs, condition.op, condition.rhs] as const);
    edits.push(...alignColumnsLeftAligned(continuationRows));
  }
  return edits.reduceRight((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

function parseTriggeredChain(command: Command) {
  const code = command.tokens.filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
  if (code.length < 5) return undefined;
  const keyword = code[0]!;
  if (keyword.kind !== 'word' || !TRIGGER_KEYWORDS.has(keyword.text.toUpperCase())) return undefined;
  if (code.at(-1)?.text !== '.') return undefined;

  return parseConditionChain(code.slice(1, -1));
}
