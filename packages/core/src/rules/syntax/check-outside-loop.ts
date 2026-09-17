import { findControlBlockPairs } from '../../parser/control-blocks.js';
import { parseAbapCommands, type Command } from '../../parser/commands.js';
import type { Token } from '../../parser/tokenizer.js';

const LOOP_KINDS = new Set(['do', 'while', 'loop', 'select', 'provide']);

export function convertSimpleChecksOutsideLoops(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const pairs = findControlBlockPairs(commands);
  const replacements: { readonly start: number; readonly end: number; readonly text: string }[] = [];
  for (let index = 0; index < commands.length; index += 1) {
    const condition = simpleInitialCheck(commands[index]!);
    if (condition === undefined || !isInsideProcedure(commands, index)) continue;
    const insideLoop = pairs.some((pair) => LOOP_KINDS.has(pair.kind) && pair.openingCommandIndex < index && index < pair.closingCommandIndex);
    if (insideLoop) continue;
    const indent = sourceText.slice(sourceText.lastIndexOf('\n', commands[index]!.startOffset) + 1, commands[index]!.startOffset);
    replacements.push({
      start: commands[index]!.startOffset,
      end: commands[index]!.endOffset,
      text: `IF ${condition.operand} IS ${condition.negated ? 'NOT ' : ''}INITIAL.\n${indent}  RETURN.\n${indent}ENDIF.`,
    });
  }
  return replacements.reduceRight((text, replacement) => text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end), sourceText);
}

function simpleInitialCheck(command: Command): { readonly operand: string; readonly negated: boolean } | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const code = command.tokens.filter((token) => token.kind !== 'whitespace');
  if (!isWord(code[0], 'CHECK') || code[1]?.kind !== 'word' || !isWord(code[2], 'IS')) return undefined;
  if (code.length === 5 && isWord(code[3], 'INITIAL') && code[4]?.text === '.') return { operand: code[1].text, negated: true };
  if (code.length === 6 && isWord(code[3], 'NOT') && isWord(code[4], 'INITIAL') && code[5]?.text === '.') return { operand: code[1].text, negated: false };
  return undefined;
}

function isWord(token: Token | undefined, text: string): token is Token {
  return token?.kind === 'word' && token.text.toUpperCase() === text;
}

function isInsideProcedure(commands: readonly Command[], commandIndex: number): boolean {
  const stack: number[] = [];
  for (let index = 0; index < commands.length; index += 1) {
    const kind = commands[index]!.kind;
    if (kind === 'method-open' || kind === 'routine-open') stack.push(index);
    if (kind === 'method-close' || kind === 'routine-close') {
      const openingIndex = stack.pop();
      if (openingIndex !== undefined && openingIndex < commandIndex && commandIndex < index) return true;
    }
  }
  return false;
}