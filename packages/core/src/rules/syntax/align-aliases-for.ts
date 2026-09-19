// Ported from com/sap/adt/abapcleaner/rules/alignment/AlignAliasesForRule.java @ v1.29.0
//
// Bounded subset: for each maximal run of >=2 consecutive top-level `ALIASES <name> FOR <target>.`
// statements (the non-chained form only — a chained `ALIASES: a FOR x, b FOR y.` is a different
// token shape and is left untouched, matching this port's general chain-avoidance pattern), left-
// pads the ALIASES/identifier/FOR columns to the widest cell in each column, reusing the shared
// `alignColumnsLeftAligned` engine (see align-helpers.ts) exactly as `ALIGN_ASSIGNMENTS` does. A
// statement with any comment token, or any shape other than exactly the five code tokens
// `ALIASES <word> FOR <word> .`, is not recognized and breaks the run — this refuses a trailing
// line-end comment (an optional 5th aligned column upstream supports) rather than risk misplacing
// one. Blank lines and comment lines between matching statements do not break a run, for the same
// reason documented in align-assignments.ts (this port's statement parser attaches them to the
// following statement rather than giving them their own Command). A row only extends a run if it
// sits on its own distinct source line from the previous row, since alignment is inherently a
// vertical/cross-line concept — two matching statements crammed onto one physical line are left
// unaligned.
import { parseAbapCommands, type Command } from '../../parser/commands.js';
import type { Token } from '../../parser/tokenizer.js';
import { alignColumnsLeftAligned } from './align-helpers.js';

export function alignAliasesFor(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const rows = commands.map(parseAliasesFor);
  const edits: { readonly start: number; readonly end: number; readonly text: string }[] = [];

  let runStart = 0;
  while (runStart < rows.length) {
    if (rows[runStart] === undefined) {
      runStart += 1;
      continue;
    }
    let runEnd = runStart;
    while (
      runEnd + 1 < rows.length
      && rows[runEnd + 1] !== undefined
      && rows[runEnd + 1]![0]!.line !== rows[runEnd]![0]!.line
    ) {
      runEnd += 1;
    }
    if (runEnd > runStart) {
      edits.push(...alignColumnsLeftAligned(rows.slice(runStart, runEnd + 1) as (readonly Token[])[]));
    }
    runStart = runEnd + 1;
  }

  return edits.reduceRight((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

function parseAliasesFor(command: Command): readonly Token[] | undefined {
  const code = command.tokens.filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
  if (code.length !== 5) return undefined;
  const [aliases, name, forKeyword, target, period] = code as [Token, Token, Token, Token, Token];
  if (aliases.kind !== 'word' || aliases.text.toUpperCase() !== 'ALIASES') return undefined;
  if (name.kind !== 'word' || forKeyword.kind !== 'word' || forKeyword.text.toUpperCase() !== 'FOR') return undefined;
  if (target.kind !== 'word' || period.text !== '.') return undefined;
  if (aliases.line !== period.line) return undefined;
  return [aliases, name, forKeyword, target];
}
