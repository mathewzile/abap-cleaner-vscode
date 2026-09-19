// Ported from com/sap/adt/abapcleaner/rules/alignment/AlignAbapDocRule.java @ v1.29.0
//
// Bounded subset: unlike every other `ALIGN_*` rule ported so far, upstream doesn't use the
// `AlignTable` engine here at all — it rewrites each matching comment token's own text with
// computed padding baked in, so this doesn't use `align-helpers.ts` either. For each maximal run of
// consecutive `"!`-prefixed ABAP Doc comment lines (blank lines between them don't break the run;
// any other token — code, or a non-`"!` comment — does) that contains more than one
// `"! @parameter <name> | <text>` / `"! @raising <name> | <text>` / `"! @exception <name> | <text>`
// line, right-pads the keyword and name columns to the widest in the run (matching upstream's
// default `AlignAcrossEmptyLines`/`AlignAcrossNonEmptyLines` = true, i.e. always continuing the run
// through both). A plain (non-parameter) ABAP Doc line inside the run — a description or
// continuation-text line — doesn't get rewritten but doesn't break the run either, matching
// upstream. A run immediately followed by another comment (rather than the real declaration it
// documents) is refused entirely, matching upstream's "only align if the whole parameter interface
// was covered" check. This works directly on ABAP's token stream, not `parser/commands.ts`'s
// statement list, since a standalone leading comment is merged into the *following* statement's
// Command in this port's statement parser rather than getting a Command of its own — the per-line
// granularity this rule needs only exists at the token level.
import { tokenize } from '../../parser/tokenizer.js';

const DOC_SIGN = '"!';
const PARAMETER_KEYWORDS = new Set(['@parameter', '@raising', '@exception']);

interface Edit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

interface ParameterDocLine {
  readonly keyword: string;
  readonly name: string;
  readonly docu: string;
}

export function alignAbapDoc(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const edits: Edit[] = [];
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index]!;
    if (token.kind !== 'comment' || !token.text.startsWith(DOC_SIGN)) {
      index += 1;
      continue;
    }

    const runIndices = [index];
    let cursor = index + 1;
    while (cursor < tokens.length) {
      const candidate = tokens[cursor]!;
      if (candidate.kind === 'whitespace') {
        cursor += 1;
        continue;
      }
      if (candidate.kind === 'comment' && candidate.text.startsWith(DOC_SIGN)) {
        runIndices.push(cursor);
        cursor += 1;
        continue;
      }
      break;
    }

    const followedByComment = tokens[cursor]?.kind === 'comment';
    const paramLines = runIndices
      .map((tokenIndex) => ({ tokenIndex, parsed: parseParameterDocLine(tokens[tokenIndex]!.text) }))
      .filter((entry): entry is { tokenIndex: number; parsed: ParameterDocLine } => entry.parsed !== undefined);

    if (paramLines.length > 1 && !followedByComment) {
      const maxKeywordLength = Math.max(...paramLines.map((line) => line.parsed.keyword.length));
      const maxNameLength = Math.max(...paramLines.map((line) => line.parsed.name.length));
      for (const { tokenIndex, parsed } of paramLines) {
        const newText = `${DOC_SIGN} ${parsed.keyword.padEnd(maxKeywordLength + 1)}${parsed.name.padEnd(maxNameLength + 1)}| ${parsed.docu}`;
        const original = tokens[tokenIndex]!;
        if (original.text !== newText) edits.push({ start: original.offset, end: original.offset + original.text.length, text: newText });
      }
    }

    index = cursor;
  }

  return edits.reduceRight((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

function parseParameterDocLine(text: string): ParameterDocLine | undefined {
  const pipeIndex = text.indexOf('|');
  if (pipeIndex < 0 || pipeIndex === text.length - 1) return undefined;

  const parts = text.slice(DOC_SIGN.length, pipeIndex).split(' ').filter((part) => part.length > 0);
  if (parts.length !== 2) return undefined;
  const [keyword, name] = parts as [string, string];
  if (!PARAMETER_KEYWORDS.has(keyword.toLowerCase())) return undefined;

  return { keyword, name, docu: text.slice(pipeIndex + 1).trim() };
}
