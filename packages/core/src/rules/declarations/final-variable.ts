// Ported from com/sap/adt/abapcleaner/rules/declarations/FinalVariableRule.java @ v1.29.0
//
// Bounded subset: replaces `DATA(name) = rhs.` with `FINAL(name) = rhs.` (the plain-assignment
// inline declaration shape; the `@DATA(...)` INTO-host-variable shape used inside ABAP SQL is not
// handled) only when `name` is read again later in the same method or form, and no later command in that
// body plainly reassigns it (`name = ...` or a compound assignment). Any method that mentions
// ASSIGNING, REF, FIELD-SYMBOL, or ASSIGN anywhere is skipped entirely, since those can create an
// indirect write path to the variable that a lexical scan cannot rule out; this mirrors the
// upstream rule's caution around indirect writes without attempting its full data-flow analysis.
import { parseAbapCommands, type Command } from '../../parser/commands.js';
import type { Token } from '../../parser/tokenizer.js';

const RISK_KEYWORDS = new Set(['ASSIGNING', 'REF', 'FIELD-SYMBOL', 'ASSIGN']);

interface ProcedureBody {
  readonly start: number;
  readonly end: number;
}

export function useFinalForImmutableInlineDeclarations(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const rewrites: { readonly start: number; readonly end: number; readonly text: string }[] = [];

  for (const body of procedureBodies(commands)) {
    if (usesRiskyConstructs(commands, body)) continue;
    for (let index = body.start; index <= body.end; index += 1) {
      const declaration = inlineDeclaration(commands[index]!);
      if (declaration === undefined) continue;
      if (!isReadAgain(commands, body, index, declaration.name)) continue;
      if (isReassignedLater(commands, body, index, declaration.name)) continue;
      rewrites.push({ start: declaration.keyword.offset, end: declaration.keyword.offset + declaration.keyword.text.length, text: 'FINAL' });
    }
  }

  return rewrites.reduceRight((text, rewrite) => text.slice(0, rewrite.start) + rewrite.text + text.slice(rewrite.end), sourceText);
}

function inlineDeclaration(command: Command): { readonly name: string; readonly keyword: Token } | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const code = command.tokens.filter((token) => token.kind !== 'whitespace');
  const [keyword, open, name, close, equals] = code;
  if (keyword?.kind !== 'word' || keyword.text.toUpperCase() !== 'DATA') return undefined;
  if (open?.text !== '(' || name?.kind !== 'word' || close?.text !== ')' || equals?.text !== '=') return undefined;
  if (code.at(-1)?.text !== '.') return undefined;
  return { name: name.text, keyword };
}

function isReadAgain(commands: readonly Command[], body: ProcedureBody, declarationIndex: number, name: string): boolean {
  const upperName = name.toUpperCase();
  for (let index = declarationIndex + 1; index <= body.end; index += 1) {
    if (commands[index]!.tokens.some((token) => token.kind === 'word' && token.text.toUpperCase() === upperName)) return true;
  }
  return false;
}

function isReassignedLater(commands: readonly Command[], body: ProcedureBody, declarationIndex: number, name: string): boolean {
  const upperName = name.toUpperCase();
  for (let index = declarationIndex + 1; index <= body.end; index += 1) {
    const code = commands[index]!.tokens.filter((token) => token.kind !== 'whitespace');
    const first = code[0];
    if (first?.kind !== 'word' || first.text.toUpperCase() !== upperName) continue;
    const second = code[1];
    if (second?.text === '=') return true;
    if (second?.kind === 'word' && '+-*/'.includes(second.text) && code[2]?.text === '=' && second.offset + second.text.length === code[2]!.offset) return true;
  }
  return false;
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

function usesRiskyConstructs(commands: readonly Command[], body: ProcedureBody): boolean {
  for (let index = body.start; index <= body.end; index += 1) {
    if (commands[index]!.tokens.some((token) => token.kind === 'word' && RISK_KEYWORDS.has(token.text.toUpperCase()))) return true;
  }
  return false;
}
