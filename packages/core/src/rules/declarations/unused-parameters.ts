// Ported from com/sap/adt/abapcleaner/rules/declarations/UnusedParametersRule.java @ v1.29.0
//
// Bounded subset: adds a `" TODO: parameter <NAME> is never used (ABAP cleaner)` comment line for
// an IMPORTING parameter that is never referenced anywhere (by word-token text) in its method's
// body, matching only the upstream rule's default IMPORTING scope ("non-interface methods" — which
// this port gets for free, since interface methods are pulled in via `INTERFACES`, not `METHODS`,
// so they're never seen by the `METHODS` scan below) and default `IgnoreEmptyMethods = true` gate
// (coarsened here to "the body has at least one non-comment code token"). EXPORTING, CHANGING, and
// RETURNING parameters are not handled — their "used" vs "assigned" semantics (including
// by-value/by-reference distinctions) are materially different from a plain reference check.
// A parameter referenced only inside a comment counts as used and is not flagged, matching this
// port's `UNUSED_VARIABLES` rule (`unused-variables.ts`) rather than upstream's finer-grained
// "only used in commented-out code" message. Only a non-chained `METHODS <name> IMPORTING ...`
// declaration whose every IMPORTING parameter has the simple shape
// `[VALUE(]<name>[)] TYPE <simple-type-name> [OPTIONAL] [DEFAULT <literal>] [##PRAGMA ...]` is
// recognized; anything more complex (`TYPE REF TO`, `TYPE ... TABLE OF`, `LIKE`, a chained
// `METHODS:` declaration) makes the whole declaration refused rather than misread. If the method's
// existing body already starts with a different (but TODO-comment-shaped) set of lines than what
// this run would produce, the method is left untouched rather than risk misplacing a developer's
// own comment; stale TODO comments for a parameter that has since become used are not removed.
import { parseAbapCommands, type Command } from '../../parser/commands.js';

interface Edit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

interface Parameter {
  readonly name: string;
  readonly isNeeded: boolean;
}

const SECTION_KEYWORDS = new Set(['EXPORTING', 'CHANGING', 'RETURNING', 'RAISING', 'EXCEPTIONS']);

export function reportUnusedImportingParameters(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const edits: Edit[] = [];
  const blocks = classBlocks(commands);

  for (const classBlock of blocks) {
    const implementation = findMatchingImplementation(blocks, classBlock);
    if (implementation === undefined) continue;

    for (let index = classBlock.start; index <= classBlock.end; index += 1) {
      const declaration = parseMethodsDeclaration(commands[index]!);
      if (declaration === undefined) continue;

      const body = findMethodBody(commands, implementation, declaration.name);
      if (body === undefined || !hasExecutableStatement(commands, body)) continue;

      const unused = declaration.params.filter((param) => !param.isNeeded && !isReferencedIn(commands, body, param.name));
      if (unused.length === 0) continue;

      const edit = todoInsertionEdit(sourceText, commands, body, unused);
      if (edit !== undefined) edits.push(edit);
    }
  }

  return edits.reduceRight((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

interface ClassBlock {
  readonly name: string;
  readonly isImplementation: boolean;
  readonly start: number;
  readonly end: number;
}

function classBlocks(commands: readonly Command[]): readonly ClassBlock[] {
  const blocks: ClassBlock[] = [];
  const stack: number[] = [];
  for (let index = 0; index < commands.length; index += 1) {
    const kind = commands[index]!.kind;
    if (kind === 'class-open') stack.push(index);
    if (kind === 'class-close') {
      const openIndex = stack.pop();
      if (openIndex === undefined) continue;
      const words = commands[openIndex]!.tokens.filter((token) => token.kind === 'word');
      const name = words[1]?.text.toUpperCase();
      const isImplementation = words.some((token) => token.text.toUpperCase() === 'IMPLEMENTATION');
      if (name !== undefined) blocks.push({ name, isImplementation, start: openIndex + 1, end: index - 1 });
    }
  }
  return blocks;
}

function findMatchingImplementation(blocks: readonly ClassBlock[], definition: ClassBlock): ClassBlock | undefined {
  if (definition.isImplementation) return undefined;
  return blocks.find((block) => block.isImplementation && block.name === definition.name);
}

function parseMethodsDeclaration(command: Command): { readonly name: string; readonly params: readonly Parameter[] } | undefined {
  const code = command.tokens.filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
  if (code[0]?.text.toUpperCase() !== 'METHODS' || code[1]?.text === ':' || code[1]?.kind !== 'word') return undefined;
  const name = code[1]!.text;

  const importingIndex = code.findIndex((token) => token.kind === 'word' && token.text.toUpperCase() === 'IMPORTING');
  if (importingIndex < 0) return undefined;

  const params: Parameter[] = [];
  let cursor = importingIndex + 1;
  while (cursor < code.length) {
    const token = code[cursor]!;
    if (token.text === '.') break;
    if (token.kind === 'word' && SECTION_KEYWORDS.has(token.text.toUpperCase())) break;

    let paramName: string;
    if (token.kind === 'word' && token.text.toUpperCase() === 'VALUE' && code[cursor + 1]?.text === '(') {
      if (code[cursor + 2]?.kind !== 'word' || code[cursor + 3]?.text !== ')') return undefined;
      paramName = code[cursor + 2]!.text;
      cursor += 4;
    } else if (token.kind === 'word') {
      paramName = token.text.replace(/^!/, '');
      cursor += 1;
    } else {
      return undefined;
    }

    if (code[cursor]?.kind !== 'word' || code[cursor]!.text.toUpperCase() !== 'TYPE') return undefined;
    cursor += 1;
    if (code[cursor]?.kind !== 'word') return undefined;
    cursor += 1;

    let isNeeded = false;
    for (;;) {
      const next = code[cursor];
      if (next?.kind !== 'word') break;
      const upper = next.text.toUpperCase();
      if (upper === 'OPTIONAL') {
        cursor += 1;
      } else if (upper === 'DEFAULT') {
        cursor += 2;
      } else if (next.text.startsWith('##')) {
        if (upper === '##NEEDED') isNeeded = true;
        cursor += 1;
      } else {
        break;
      }
    }
    params.push({ name: paramName, isNeeded });
  }

  return params.length === 0 ? undefined : { name, params };
}

interface MethodBody {
  readonly start: number;
  readonly end: number;
}

function findMethodBody(commands: readonly Command[], implementation: ClassBlock, methodName: string): MethodBody | undefined {
  const upperName = methodName.toUpperCase();
  for (let index = implementation.start; index <= implementation.end; index += 1) {
    if (commands[index]!.kind !== 'method-open') continue;
    const words = commands[index]!.tokens.filter((token) => token.kind === 'word');
    if (words[1]?.text.toUpperCase() !== upperName) continue;
    for (let closeIndex = index + 1; closeIndex <= implementation.end; closeIndex += 1) {
      if (commands[closeIndex]!.kind === 'method-close') return { start: index + 1, end: closeIndex - 1 };
    }
  }
  return undefined;
}

function hasExecutableStatement(commands: readonly Command[], body: MethodBody): boolean {
  for (let index = body.start; index <= body.end; index += 1) {
    if (commands[index]!.tokens.some((token) => token.kind !== 'whitespace' && token.kind !== 'comment')) return true;
  }
  return false;
}

function isReferencedIn(commands: readonly Command[], body: MethodBody, name: string): boolean {
  const upperName = name.toUpperCase();
  for (let index = body.start; index <= body.end; index += 1) {
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

function todoInsertionEdit(sourceText: string, commands: readonly Command[], body: MethodBody, unused: readonly Parameter[]): Edit | undefined {
  const messages = unused.map((param) => `TODO: parameter ${param.name.toUpperCase()} is never used (ABAP cleaner)`);
  const existing = leadingCommentTexts(commands, body, messages.length);
  if (arraysEqual(existing, messages)) return undefined;
  if (existing.some((text) => /^" TODO: parameter .* is never used \(ABAP cleaner\)$/.test(text))) return undefined;

  const insertAt = commands[body.start]!.tokens.find((token) => token.kind !== 'whitespace')!.offset;
  const indent = lineIndent(sourceText, insertAt);
  const insertedText = messages.map((message) => `" ${message}\n${indent}`).join('');
  return { start: insertAt, end: insertAt, text: insertedText };
}

function leadingCommentTexts(commands: readonly Command[], body: MethodBody, limit: number): readonly string[] {
  const texts: string[] = [];
  for (let index = body.start; index <= body.end && texts.length < limit; index += 1) {
    const code = commands[index]!.tokens.filter((token) => token.kind !== 'whitespace');
    if (code.length !== 1 || code[0]!.kind !== 'comment') break;
    texts.push(code[0]!.text.trim());
  }
  return texts;
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === `" ${b[index]}`);
}

function lineIndent(sourceText: string, offset: number): string {
  const lineStart = sourceText.lastIndexOf('\n', offset - 1) + 1;
  return /^[ \t]*/.exec(sourceText.slice(lineStart, offset))![0];
}
