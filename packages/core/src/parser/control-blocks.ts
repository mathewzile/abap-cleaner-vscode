import type { Command } from './commands.js';

export type ControlBlockKind = 'if' | 'case' | 'do' | 'while' | 'loop' | 'try' | 'select' | 'provide';

export interface ControlBlockPair {
  readonly kind: ControlBlockKind;
  readonly openingCommandIndex: number;
  readonly closingCommandIndex: number;
}

export function findControlBlockPairs(commands: readonly Command[]): readonly ControlBlockPair[] {
  const pairs: ControlBlockPair[] = [];
  const stack: { readonly kind: ControlBlockKind; readonly commandIndex: number }[] = [];
  for (let commandIndex = 0; commandIndex < commands.length; commandIndex += 1) {
    const boundary = controlBlockBoundary(commands[commandIndex]!);
    if (boundary === undefined) continue;
    if (boundary.opens) {
      if (boundary.kind === 'select' && !hasMatchingEndSelect(commands, commandIndex)) continue;
      stack.push({ kind: boundary.kind, commandIndex });
    } else {
      const opening = stack.at(-1);
      if (opening?.kind === boundary.kind) {
        pairs.push({ kind: boundary.kind, openingCommandIndex: opening.commandIndex, closingCommandIndex: commandIndex });
        stack.pop();
      }
    }
  }
  return pairs;
}

export function findEnclosingControlBlock(commands: readonly Command[], commandIndex: number): ControlBlockPair | undefined {
  return findControlBlockPairs(commands)
    .filter((pair) => pair.openingCommandIndex <= commandIndex && commandIndex <= pair.closingCommandIndex)
    .sort((left, right) => (left.closingCommandIndex - left.openingCommandIndex) - (right.closingCommandIndex - right.openingCommandIndex))[0];
}

function controlBlockBoundary(command: Command): { readonly kind: ControlBlockKind; readonly opens: boolean } | undefined {
  const firstWord = command.tokens.find((token) => token.kind === 'word')?.text.toUpperCase();
  switch (firstWord) {
    case 'IF': return { kind: 'if', opens: true };
    case 'ENDIF': return { kind: 'if', opens: false };
    case 'CASE': return { kind: 'case', opens: true };
    case 'ENDCASE': return { kind: 'case', opens: false };
    case 'DO': return { kind: 'do', opens: true };
    case 'ENDDO': return { kind: 'do', opens: false };
    case 'WHILE': return { kind: 'while', opens: true };
    case 'ENDWHILE': return { kind: 'while', opens: false };
    case 'LOOP': return { kind: 'loop', opens: true };
    case 'ENDLOOP': return { kind: 'loop', opens: false };
    case 'TRY': return { kind: 'try', opens: true };
    case 'ENDTRY': return { kind: 'try', opens: false };
    case 'SELECT': return isNonLoopSelect(command)
      ? undefined
      : { kind: 'select', opens: true };
    case 'ENDSELECT': return { kind: 'select', opens: false };
    case 'PROVIDE': return { kind: 'provide', opens: true };
    case 'ENDPROVIDE': return { kind: 'provide', opens: false };
    default: return undefined;
  }
}

export function isNonLoopSelect(command: Command): boolean {
  const words = command.tokens.filter((token) => token.kind === 'word').map((token) => token.text.toUpperCase());
  return words.includes('SINGLE')
    || words.some((word, index) => (word === 'INTO' || word === 'APPENDING') && words.slice(index + 1).includes('TABLE'));
}

function hasMatchingEndSelect(commands: readonly Command[], openingIndex: number): boolean {
  let nestedSelects = 0;
  for (let index = openingIndex + 1; index < commands.length; index += 1) {
    const boundary = controlBlockBoundary(commands[index]!);
    if (boundary?.kind === 'select' && boundary.opens) nestedSelects += 1;
    if (boundary?.kind === 'select' && !boundary.opens) {
      if (nestedSelects === 0) return true;
      nestedSelects -= 1;
    }
    if (boundary !== undefined && !boundary.opens && boundary.kind !== 'select') return false;
  }
  return false;
}