import { findControlBlockPairs } from '../../parser/control-blocks.js';
import { parseAbapCommands, type Command } from '../../parser/commands.js';

const LOOP_KINDS = new Set(['do', 'while', 'loop', 'select', 'provide']);

export function replaceExitOutsideLoops(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const pairs = findControlBlockPairs(commands);
  const replacements: { readonly start: number; readonly end: number }[] = [];
  for (let index = 0; index < commands.length; index += 1) {
    if (!isBareExit(commands[index]!) || !isInsideProcedure(commands, index)) continue;
    const insideLoop = pairs.some((pair) => LOOP_KINDS.has(pair.kind) && pair.openingCommandIndex < index && index < pair.closingCommandIndex);
    if (!insideLoop) {
      const exitToken = commands[index]!.tokens.find((token) => token.kind === 'word' && token.text.toUpperCase() === 'EXIT');
      if (exitToken !== undefined) replacements.push({ start: exitToken.offset, end: exitToken.offset + exitToken.text.length });
    }
  }
  return replacements.reduceRight((text, replacement) => text.slice(0, replacement.start) + 'RETURN' + text.slice(replacement.end), sourceText);
}

function isBareExit(command: Command): boolean {
  const code = command.tokens.filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
  return code.length === 2 && code[0]?.kind === 'word' && code[0].text.toUpperCase() === 'EXIT' && code[1]?.text === '.';
}

function isInsideProcedure(commands: readonly Command[], commandIndex: number): boolean {
  const stack: { readonly opener: Command['kind']; readonly index: number }[] = [];
  for (let index = 0; index < commands.length; index += 1) {
    const kind = commands[index]!.kind;
    if (kind === 'method-open' || kind === 'routine-open') stack.push({ opener: kind, index });
    if (kind === 'method-close' || kind === 'routine-close') {
      const opening = stack.pop();
      if (opening !== undefined && opening.index < commandIndex && commandIndex < index) return true;
    }
  }
  return false;
}