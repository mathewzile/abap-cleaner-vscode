// Ported from com/sap/adt/abapcleaner/rules/alignment/AlignMethodsForTestingRule.java @ v1.29.0
//
// Bounded subset: for each maximal run of >=2 consecutive top-level, single-line, non-chained
// `METHODS <name> FOR TESTING.` statements, left-pads the METHODS/name columns to the widest cell
// in each, reusing the shared `alignColumnsLeftAligned` engine exactly as `ALIGN_METHODS_REDEFINITION`
// does (the two upstream columns this shares its shape with). `TESTING` always follows `FOR`
// immediately with exactly one space, so it needs no column of its own. Does not implement: the
// `METHODS: a FOR TESTING, b FOR TESTING.` chained form (aligned independently upstream, a fully
// separate concern this port doesn't replicate); the optional `ABSTRACT` and `RAISING <exception>`
// columns upstream supports (present on <20% of rows in practice, per upstream's own
// `FILL_RATIO_TO_JUSTIFY_OWN_COLUMN` — a statement using either is simply not recognized and breaks
// the run); a trailing line-end comment; or a statement whose `METHODS`/name/`FOR TESTING` span more
// than one line, for the same "no cross-line cell" reason `ALIGN_METHODS_REDEFINITION` documents. A
// row only extends a run if it sits on its own distinct source line from the previous row, since
// alignment is inherently a vertical/cross-line concept.
import { parseAbapCommands, type Command } from '../../parser/commands.js';
import type { Token } from '../../parser/tokenizer.js';
import { alignColumnsLeftAligned } from './align-helpers.js';

export function alignMethodsForTesting(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const rows = commands.map(parseMethodsForTesting);
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

function parseMethodsForTesting(command: Command): readonly Token[] | undefined {
  if (command.startLine !== command.endLine) return undefined;
  const code = command.tokens.filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
  if (code.length !== 5) return undefined;
  const [methods, name, forKeyword, testing, period] = code as [Token, Token, Token, Token, Token];
  if (methods.kind !== 'word' || methods.text.toUpperCase() !== 'METHODS') return undefined;
  if (name.kind !== 'word') return undefined;
  if (forKeyword.kind !== 'word' || forKeyword.text.toUpperCase() !== 'FOR') return undefined;
  if (testing.kind !== 'word' || testing.text.toUpperCase() !== 'TESTING') return undefined;
  if (period.text !== '.') return undefined;
  return [methods, name, forKeyword];
}
