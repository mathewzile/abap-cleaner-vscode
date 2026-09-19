// Ported from com/sap/adt/abapcleaner/rules/ddl/emptylines/DdlEmptyLinesWithinSectionsRule.java @ v1.29.0
//
// Bounded subset: caps consecutive blank lines anywhere in a DDL/DCL source file to at most one
// (matching the upstream rule's default `MaxConsecutiveEmptyLines` of 1) and trims blank lines at
// the end of the file, operating only on whitespace tokens so that newlines inside a block comment
// or literal are never touched. This does not yet classify DDL sections (entity parameters, JOINs,
// ASSOCIATIONs, the select list) the way the upstream "between sections" and "within sections"
// rules do, since that requires DDL command-boundary and section-start detection this port does
// not have yet.
import { tokenize } from '../../parser/tokenizer.js';

export function normalizeDdlEmptyLines(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const edits: { readonly start: number; readonly end: number; readonly text: string }[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.kind !== 'whitespace') continue;
    const lineFeeds = countLineFeeds(token.text);
    if (lineFeeds < 2) continue;
    const isTrailing = tokens.slice(index + 1).every((next) => next.kind === 'whitespace');
    const maxLineFeeds = isTrailing ? 1 : 2;
    if (lineFeeds <= maxLineFeeds) continue;
    edits.push({ start: token.offset, end: token.offset + token.text.length, text: replacementFor(token.text, maxLineFeeds) });
  }

  return edits.reduceRight((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

function countLineFeeds(text: string): number {
  let count = 0;
  for (const character of text) if (character === '\n') count += 1;
  return count;
}

function replacementFor(whitespace: string, maxLineFeeds: number): string {
  const trailingIndent = /[ \t]*$/.exec(whitespace)![0];
  return '\n'.repeat(maxLineFeeds) + trailingIndent;
}
