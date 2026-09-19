// Shared "is this a simple, bounded-recognizable SELECT statement" gate reused by every
// `ALIGN_SELECT_*` rule, extracted from `align-select-clauses.ts` (the first of this family) so the
// refusal vocabulary is defined exactly once. See `align-select-clauses.ts`'s header comment for the
// full rationale behind each check; in short: a `Command` whose first code token is `SELECT`, ending
// in one `.` (not a `:` chain), spanning more than one source line already (an already single-line
// statement matches upstream's `MainQueryOneLinerAction = KEEP_EXISTING` default and is left
// completely untouched by every rule in this family, not just the clause-repositioning one), that
// doesn't open a `SELECT ... ENDSELECT` loop (`parser/control-blocks.ts`'s `isNonLoopSelect`), and
// that contains no `FOR ALL ENTRIES`, `%_HINTS` token, or second `SELECT` keyword anywhere beyond the
// first (conservatively covering subqueries and `UNION`/`INTERSECT`/`EXCEPT` chains in one check,
// since all three syntactically require a second `SELECT`).
import type { Command } from '../../parser/commands.js';
import { isNonLoopSelect } from '../../parser/control-blocks.js';
import type { Token } from '../../parser/tokenizer.js';

export function parseSimpleSelectCode(command: Command): readonly Token[] | undefined {
  const code = command.tokens.filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
  if (code.length < 4) return undefined;
  const selectToken = code[0]!;
  if (selectToken.kind !== 'word' || selectToken.text.toUpperCase() !== 'SELECT') return undefined;
  if (code[1]?.text === ':') return undefined;
  if (code.at(-1)?.text !== '.') return undefined;
  if (command.startLine === command.endLine) return undefined;
  if (!isNonLoopSelect(command)) return undefined;
  if (isRefused(code)) return undefined;
  return code;
}

function isRefused(code: readonly Token[]): boolean {
  const extraSelectExists = code.slice(1).some((token) => token.kind === 'word' && token.text.toUpperCase() === 'SELECT');
  if (extraSelectExists) return true;

  if (code.some((token) => token.kind === 'word' && token.text.toUpperCase() === '%_HINTS')) return true;

  for (let index = 0; index < code.length - 2; index += 1) {
    const words = [code[index]!, code[index + 1]!, code[index + 2]!];
    if (words.every((token) => token.kind === 'word')) {
      const [first, second, third] = words.map((token) => token.text.toUpperCase());
      if (first === 'FOR' && second === 'ALL' && third === 'ENTRIES') return true;
    }
  }
  return false;
}
