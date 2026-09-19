// Ported from com/sap/adt/abapcleaner/rules/alignment/AlignClearFreeAndSortRule.java @ v1.29.0
//
// Bounded subset: of the 4 chain shapes upstream aligns (CLEAR:, FREE:, SORT ... BY, CATCH), only
// `CLEAR: item, item, ...` and `FREE: item, item, ...` are handled, and only when every chained
// item is a single plain identifier with no addition (e.g. `WITH ... IN CHARACTER MODE`) — a chain
// item followed by anything other than `,` or the closing `.` makes the whole statement refused
// rather than misread. Upstream doesn't use the general `AlignTable` engine for this shape either
// (it moves each item to its own line via direct token/indent manipulation); matching that, this
// breaks each item after the first onto its own line at the column of the first item (the column
// right after the chain colon), reusing the same `breakBeforeWithIndent` token-scanning helper the
// DDL `DDL_POSITION_*` rules use — the technique is language-agnostic even though that module lives
// under `rules/ddl/`. `SORT ... BY` and `CATCH` are not handled.
import { parseAbapCommands, type Command } from '../../parser/commands.js';
import type { Token } from '../../parser/tokenizer.js';
import { applyEdits, breakBeforeWithIndent } from '../ddl/position-helpers.js';

const CHAIN_KEYWORDS = new Set(['CLEAR', 'FREE']);

export function alignClearFreeChains(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const edits: { readonly start: number; readonly end: number; readonly text: string }[] = [];

  for (const command of commands) {
    const chain = parseClearFreeChain(command);
    if (chain === undefined) continue;
    const indent = columnOf(sourceText, chain.items[0]!.offset);
    for (const item of chain.items.slice(1)) {
      const index = command.tokens.indexOf(item);
      edits.push(...breakBeforeWithIndent(command.tokens, index, indent));
    }
  }

  return applyEdits(sourceText, edits);
}

function parseClearFreeChain(command: Command): { readonly items: readonly Token[] } | undefined {
  const code = command.tokens.filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
  if (code.length < 4) return undefined;
  const keyword = code[0]!;
  if (keyword.kind !== 'word' || !CHAIN_KEYWORDS.has(keyword.text.toUpperCase())) return undefined;
  if (code[1]?.text !== ':') return undefined;

  const items: Token[] = [];
  let index = 2;
  while (index < code.length) {
    const item = code[index]!;
    if (item.kind !== 'word') return undefined;
    items.push(item);
    const separator = code[index + 1];
    if (separator?.text === ',') {
      index += 2;
    } else if (separator?.text === '.') {
      index += 2;
      break;
    } else {
      return undefined;
    }
  }
  if (index !== code.length || items.length < 2) return undefined;
  return { items };
}

function columnOf(sourceText: string, offset: number): number {
  return offset - (sourceText.lastIndexOf('\n', offset - 1) + 1);
}
