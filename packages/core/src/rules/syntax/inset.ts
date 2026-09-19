// Ported from com/sap/adt/abapcleaner/rules/prettyprinter/IndentRule.java @ v1.29.0
//
// Bounded subset: reindents only the leading line of each recognized command (and any full-line
// comments directly attached above it) to match its block nesting depth, using the same block
// keywords as the parser's control-block matcher plus CLASS/METHOD/FORM/FUNCTION/INTERFACE
// boundaries. Chained same-line commands and internal continuation lines of multi-line statements
// are left untouched, matching the upstream rule's "relative indents ... are not changed"
// restriction. If a mid-block keyword (ELSE, ELSEIF, WHEN, CATCH, CLEANUP) or a closing keyword is
// found without a matching, correctly-typed block on the stack, the whole file is left unchanged
// rather than risk misindenting it.
import { parseAbapCommands, type Command } from '../../parser/commands.js';
import { findControlBlockPairs, type ControlBlockKind } from '../../parser/control-blocks.js';

const INDENT_STEP = 2;

type BlockKind = ControlBlockKind | 'class' | 'interface' | 'method' | 'routine';

interface Edit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export function normalizeIndentation(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  if (commands.length === 0) return sourceText;

  const openerKind = new Map<number, BlockKind>();
  const closerKind = new Map<number, BlockKind>();
  for (const pair of findControlBlockPairs(commands)) {
    openerKind.set(pair.openingCommandIndex, pair.kind);
    closerKind.set(pair.closingCommandIndex, pair.kind);
  }
  for (let index = 0; index < commands.length; index += 1) {
    const kind = commands[index]!.kind;
    if (kind === 'class-open') openerKind.set(index, 'class');
    if (kind === 'class-close') closerKind.set(index, 'class');
    if (kind === 'interface-open') openerKind.set(index, 'interface');
    if (kind === 'interface-close') closerKind.set(index, 'interface');
    if (kind === 'method-open') openerKind.set(index, 'method');
    if (kind === 'method-close') closerKind.set(index, 'method');
    if (kind === 'routine-open') openerKind.set(index, 'routine');
    if (kind === 'routine-close') closerKind.set(index, 'routine');
  }

  const edits: Edit[] = [];
  const stack: BlockKind[] = [];

  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index]!;
    const closer = closerKind.get(index);
    const midExpected = midBlockExpectedKind(command);

    let lineDepth: number;
    if (closer !== undefined) {
      if (stack.at(-1) !== closer) return sourceText;
      stack.pop();
      lineDepth = stack.length;
    } else if (midExpected !== undefined) {
      if (stack.at(-1) !== midExpected) return sourceText;
      lineDepth = stack.length - 1;
    } else {
      lineDepth = stack.length;
    }

    edits.push(...reindentTargets(sourceText, command, lineDepth * INDENT_STEP));

    const opener = openerKind.get(index);
    if (opener !== undefined) stack.push(opener);
  }

  return applyEdits(sourceText, edits);
}

function midBlockExpectedKind(command: Command): BlockKind | undefined {
  const firstWord = command.tokens.find((token) => token.kind === 'word')?.text.toUpperCase();
  switch (firstWord) {
    case 'ELSE':
    case 'ELSEIF': return 'if';
    case 'WHEN': return 'case';
    case 'CATCH':
    case 'CLEANUP': return 'try';
    default: return undefined;
  }
}

function reindentTargets(sourceText: string, command: Command, newIndent: number): Edit[] {
  const contentTokens = command.tokens.filter((token) => token.kind !== 'whitespace');
  if (contentTokens.length === 0) return [];

  const edits: Edit[] = [];
  for (const token of contentTokens) {
    if (!isLineStart(sourceText, token.offset)) {
      return edits.length === 0 ? [] : edits;
    }
    // an asterisk-style full-line comment is only recognized as a comment when it starts in
    // column 1; reindenting it would push it out of column 1 and change its meaning on the next
    // pass, so it (and only it) is left untouched, matching Java's isAsteriskCommentLine() skip.
    if (token.kind !== 'comment' || token.text[0] !== '*') {
      edits.push(...reindentEditFor(sourceText, token.offset, newIndent));
    }
    if (token.kind !== 'comment') break;
  }
  return edits;
}

function reindentEditFor(sourceText: string, offset: number, newIndent: number): Edit[] {
  const lineStart = sourceText.lastIndexOf('\n', offset - 1) + 1;
  const currentIndent = sourceText.slice(lineStart, offset);
  const targetIndent = ' '.repeat(newIndent);
  return currentIndent === targetIndent ? [] : [{ start: lineStart, end: offset, text: targetIndent }];
}

function isLineStart(sourceText: string, offset: number): boolean {
  return offset === 0 || sourceText[offset - 1] === '\n';
}

function applyEdits(sourceText: string, edits: readonly Edit[]): string {
  if (edits.length === 0) return sourceText;
  const pieces: string[] = [];
  let cursor = 0;
  for (const edit of edits) {
    pieces.push(sourceText.slice(cursor, edit.start), edit.text);
    cursor = edit.end;
  }
  pieces.push(sourceText.slice(cursor));
  return pieces.join('');
}
