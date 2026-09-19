// Ported from com/sap/adt/abapcleaner/rules/declarations/UnusedVariablesRule.java @ v1.29.0
//
// Bounded subset: deletes a standalone, comment-free `DATA name TYPE type.` declaration only when
// `name` never occurs as a word token anywhere else in the enclosing method or form body,
// including inside comments (so a name that is merely commented out is left alone rather than
// guessed at). A method that contains a dynamic ASSIGN (`ASSIGN (...) TO ...`) is skipped
// entirely, since a dynamically resolved field name could reference the variable without its name
// ever appearing as a token. Chains, structured (BEGIN OF) declarations, and inline declarations
// are not recognized by `declaredScalarName` and are therefore left untouched.
import { parseAbapCommands, type Command } from '../../parser/commands.js';

interface ProcedureBody {
  readonly start: number;
  readonly end: number;
}

export function removeUnusedDeclaredVariables(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const removals: { readonly start: number; readonly end: number }[] = [];

  for (const body of procedureBodies(commands)) {
    if (usesDynamicAssign(commands, body)) continue;
    for (let index = body.start; index <= body.end; index += 1) {
      const name = declaredScalarName(commands[index]!);
      if (name === undefined) continue;
      if (isReferencedElsewhere(commands, body, index, name)) continue;
      removals.push({ start: commands[index]!.startOffset, end: commands[index]!.endOffset });
    }
  }

  return removals.reduceRight((text, removal) => text.slice(0, removal.start) + text.slice(removal.end), sourceText);
}

function declaredScalarName(command: Command): string | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const words = command.tokens.filter((token) => token.kind === 'word');
  const code = command.tokens.filter((token) => token.kind !== 'whitespace');
  if (words.length !== 4 || code.length !== 5) return undefined;
  if (words[0]?.text.toUpperCase() !== 'DATA' || words[2]?.text.toUpperCase() !== 'TYPE') return undefined;
  if (code.at(-1)?.text !== '.') return undefined;
  return words[1]?.text;
}

function isReferencedElsewhere(commands: readonly Command[], body: ProcedureBody, declarationIndex: number, name: string): boolean {
  const upperName = name.toUpperCase();
  for (let index = body.start; index <= body.end; index += 1) {
    if (index === declarationIndex) continue;
    for (const token of commands[index]!.tokens) {
      if (token.kind === 'word' && token.text.toUpperCase() === upperName) return true;
      if (token.kind === 'comment' && containsWholeWord(token.text, upperName)) return true;
    }
  }
  return false;
}

function containsWholeWord(text: string, upperWord: string): boolean {
  return new RegExp(`(?:^|[^A-Za-z0-9_])${upperWord}(?:[^A-Za-z0-9_]|$)`, 'i').test(text);
}

function procedureBodies(commands: readonly Command[]): readonly ProcedureBody[] {
  const bodies: ProcedureBody[] = [];
  const stack: number[] = [];
  for (let index = 0; index < commands.length; index += 1) {
    const kind = commands[index]!.kind;
    if (kind === 'method-open' || kind === 'routine-open') stack.push(index);
    if (kind === 'method-close' || kind === 'routine-close') {
      const openingIndex = stack.pop();
      // include the closing command itself, since a trailing full-line comment with no period of
      // its own is merged into it rather than into a Command of its own
      if (openingIndex !== undefined) bodies.push({ start: openingIndex + 1, end: index });
    }
  }
  return bodies;
}

function usesDynamicAssign(commands: readonly Command[], body: ProcedureBody): boolean {
  for (let index = body.start; index <= body.end; index += 1) {
    const code = commands[index]!.tokens.filter((token) => token.kind !== 'whitespace');
    if (code[0]?.kind === 'word' && code[0].text.toUpperCase() === 'ASSIGN' && code[1]?.text === '(') return true;
  }
  return false;
}
