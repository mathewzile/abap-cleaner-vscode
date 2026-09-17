import { parseAbapStatements, type Statement } from './statements.js';
import type { CleanupRangeExpandMode } from '../api.js';
import { findEnclosingControlBlock } from './control-blocks.js';
import type { Token } from './tokenizer.js';

export type CommandKind = 'class-open' | 'class-close' | 'interface-open' | 'interface-close' | 'method-open' | 'method-close' | 'routine-open' | 'routine-close' | 'other';

export interface Command {
  readonly kind: CommandKind;
  readonly startLine: number;
  readonly endLine: number;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly tokens: readonly Token[];
}

export function parseAbapCommands(sourceText: string): readonly Command[] {
  return parseAbapStatements(sourceText).map(toCommand);
}

export function expandAbapRange(
  sourceText: string,
  startLine: number,
  endLine: number,
  mode: CleanupRangeExpandMode,
): { readonly startLine: number; readonly endLine: number } | undefined {
  if (mode === 'FULL_DOCUMENT') {
    return { startLine: 1, endLine: Math.max(1, sourceText.split(/\r?\n/).length) };
  }
  const statements = parseAbapStatements(sourceText);
  const selected = statements.filter((statement) => statement.endLine >= startLine && statement.rangeStartLine <= endLine);
  if (selected.length === 0) return undefined;
  if (mode === 'FULL_STATEMENT') {
    return { startLine: selected[0]!.rangeStartLine, endLine: selected.at(-1)!.endLine };
  }
  const commands = parseAbapCommands(sourceText);
  const selectedIndex = commands.findIndex((command) => command.endLine >= startLine && command.startLine <= endLine);
  const bounds = mode === 'FULL_CONTROL_BLOCK'
    ? enclosingControlBlock(commands, selectedIndex)
    : mode === 'FULL_METHOD'
      ? enclosingMethodLikeBlock(commands, selectedIndex)
      : enclosingClassLikeBlock(commands, selectedIndex);
  if (bounds === undefined) return { startLine: selected[0]!.rangeStartLine, endLine: selected.at(-1)!.endLine };
  return { startLine: commands[bounds.start]!.startLine, endLine: commands[bounds.end]!.endLine };
}

function enclosingControlBlock(commands: readonly Command[], selectedIndex: number): { readonly start: number; readonly end: number } | undefined {
  const pair = findEnclosingControlBlock(commands, selectedIndex);
  return pair === undefined ? undefined : { start: pair.openingCommandIndex, end: pair.closingCommandIndex };
}

function enclosingMethodLikeBlock(commands: readonly Command[], selectedIndex: number): { readonly start: number; readonly end: number } | undefined {
  return enclosingBlock(commands, selectedIndex, 'method-open', 'method-close')
    ?? enclosingBlock(commands, selectedIndex, 'routine-open', 'routine-close');
}

function enclosingClassLikeBlock(commands: readonly Command[], selectedIndex: number): { readonly start: number; readonly end: number } | undefined {
  return enclosingBlock(commands, selectedIndex, 'class-open', 'class-close')
    ?? enclosingBlock(commands, selectedIndex, 'interface-open', 'interface-close');
}

function enclosingBlock(
  commands: readonly Command[],
  selectedIndex: number,
  opener: CommandKind,
  closer: CommandKind,
): { readonly start: number; readonly end: number } | undefined {
  if (selectedIndex < 0) return undefined;
  const openers: number[] = [];
  for (let index = 0; index < commands.length; index += 1) {
    if (commands[index]!.kind === opener) openers.push(index);
    if (commands[index]!.kind === closer) {
      const start = openers.pop();
      if (start !== undefined && start <= selectedIndex && selectedIndex <= index) return { start, end: index };
    }
  }
  return undefined;
}

function toCommand(statement: Statement): Command {
  const first = statement.tokens.find((token) => token.kind !== 'whitespace' && token.kind !== 'comment')!;
  const last = statement.tokens.at(-1)!;
  return {
    kind: commandKind(statement.tokens),
    startLine: statement.rangeStartLine,
    endLine: statement.endLine,
    startOffset: first.offset,
    endOffset: last.offset + last.text.length,
    tokens: statement.tokens,
  };
}

function commandKind(tokens: readonly Token[]): CommandKind {
  const firstWord = tokens.find((token) => token.kind === 'word')?.text.toUpperCase();
  if (firstWord === 'METHOD') return 'method-open';
  if (firstWord === 'ENDMETHOD') return 'method-close';
  if (firstWord === 'FORM' || firstWord === 'FUNCTION') return 'routine-open';
  if (firstWord === 'ENDFORM' || firstWord === 'ENDFUNCTION') return 'routine-close';
  if (firstWord === 'CLASS' && !tokens.some((token) => token.kind === 'word' && token.text.toUpperCase() === 'DEFERRED')) return 'class-open';
  if (firstWord === 'ENDCLASS') return 'class-close';
  if (firstWord === 'INTERFACE') return 'interface-open';
  if (firstWord === 'ENDINTERFACE') return 'interface-close';
  return 'other';
}