// Ported from com/sap/adt/abapcleaner/rules/alignment/AlignMethodsRedefinitionRule.java @ v1.29.0
//
// Bounded subset: for each maximal run of >=2 consecutive top-level, single-line, non-chained
// `METHODS <name> REDEFINITION.` statements, left-pads the METHODS/name columns to the widest cell
// in each, reusing the shared `alignColumnsLeftAligned` engine exactly as `ALIGN_ALIASES_FOR` does.
// Does not implement: the `METHODS: a REDEFINITION, b REDEFINITION.` chained form (upstream aligns
// chains independently, as a fully separate concern this port doesn't replicate); the `FINAL
// REDEFINITION` two-token alternative (upstream's `REDEFINITION|FINAL REDEFINITION` column needs a
// variable-width multi-token cell, which the current bounded engine deliberately doesn't support —
// a statement using this form is simply not recognized and breaks the run); a trailing line-end
// comment (an optional column upstream supports); or a statement whose `METHODS`/name/`REDEFINITION`
// span more than one line — upstream's `AlignTable` preserves an existing line break between cells
// and only pads horizontal gaps within an existing line, a nuance this bounded engine's single-line
// assumption doesn't model, so a multi-line statement is left untouched rather than misaligned. A
// row only extends a run if it sits on its own distinct source line from the previous row, since
// alignment is inherently a vertical/cross-line concept.
import { parseAbapCommands, type Command } from '../../parser/commands.js';
import type { Token } from '../../parser/tokenizer.js';
import { alignColumnsLeftAligned } from './align-helpers.js';

export function alignMethodsRedefinition(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const rows = commands.map(parseMethodsRedefinition);
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

function parseMethodsRedefinition(command: Command): readonly Token[] | undefined {
  if (command.startLine !== command.endLine) return undefined;
  const code = command.tokens.filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
  if (code.length !== 4) return undefined;
  const [methods, name, redefinition, period] = code as [Token, Token, Token, Token];
  if (methods.kind !== 'word' || methods.text.toUpperCase() !== 'METHODS') return undefined;
  if (name.kind !== 'word') return undefined;
  if (redefinition.kind !== 'word' || redefinition.text.toUpperCase() !== 'REDEFINITION') return undefined;
  if (period.text !== '.') return undefined;
  return [methods, name, redefinition];
}
