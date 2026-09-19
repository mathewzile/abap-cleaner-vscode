// Ported from com/sap/adt/abapcleaner/rules/declarations/LocalDeclarationOrderRule.java @ v1.29.0
//
// Bounded subset: of the 5 declaration kinds upstream relocates and groups (TYPES, CONSTANTS,
// STATICS, DATA, FIELD-SYMBOLS — DATA/STATICS/FIELD-SYMBOLS default to reordering by first-use,
// meaningfully more work than relocation alone), only CONSTANTS is handled, using upstream's other
// default (`METHOD_START_KEEP_ORDER` — preserve original relative order, no usage scan needed).
// Moves every simple, non-chained, comment-free `CONSTANTS <name> TYPE <simple-type> VALUE
// <literal>.` declaration found anywhere in a method/form/function body to immediately after the
// last already-correctly-positioned leading CONSTANTS declaration (or to the very top of the body
// if none are positioned yet), preserving the relative order of the moved declarations. A chained
// declaration, one with a `LIKE` clause or a complex type clause, or one with an attached leading
// comment is left in place rather than moved — matching upstream's own exclusions for chains,
// non-satisfiable `LIKE`/forward-reference dependencies, and comment-attachment, but via refusal
// rather than replicating upstream's chain-reordering and comment-carrying logic. The whole body is
// refused if it contains a `BEGIN OF`/`END OF` structured declaration anywhere (upstream never
// moves these; this port doesn't try to look past them either) or a dynamic `ASSIGN`, mirroring
// `UNUSED_VARIABLES`'s dynamic-`ASSIGN` gate — moving (not deleting) a declaration's text doesn't
// change what it's visible to in ABAP's whole-procedure declaration scoping, so this is a
// deliberately more conservative gate than strictly required, not a correctness necessity. A moved
// declaration keeps its original indentation; final reindentation is `INSET`'s job, which runs
// later in the pipeline and reads the *final* block structure, so a declaration that started nested
// inside a control block is correctly reindented to method-body depth after this rule relocates it.
// Removing a declaration also removes whatever blank-line gap immediately preceded it, rather than
// attempting to preserve or reconstruct ideal spacing at the old site.
import { parseAbapCommands, type Command } from '../../parser/commands.js';

interface Edit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

interface ProcedureBody {
  readonly start: number;
  readonly end: number;
}

export function moveLocalConstantsToMethodStart(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const edits: Edit[] = [];

  for (const body of procedureBodies(commands)) {
    if (containsStructuredDeclaration(commands, body)) continue;
    if (usesDynamicAssign(commands, body)) continue;

    let prefixEnd = body.start - 1;
    while (prefixEnd + 1 <= body.end && isSimpleConstant(commands[prefixEnd + 1]!)) prefixEnd += 1;

    const misplaced: number[] = [];
    for (let index = prefixEnd + 1; index <= body.end; index += 1) {
      if (isSimpleConstant(commands[index]!)) misplaced.push(index);
    }
    if (misplaced.length === 0) continue;

    const anchor = commands[prefixEnd]!.endOffset;
    const insertedText = misplaced.map((index) => `\n${lineIndent(sourceText, commands[index]!.startOffset)}${coreText(commands[index]!)}`).join('');
    edits.push({ start: anchor, end: anchor, text: insertedText });
    for (const index of misplaced) {
      const command = commands[index]!;
      edits.push({ start: command.tokens[0]!.offset, end: command.endOffset, text: '' });
    }
  }

  return edits.reduceRight((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

function isSimpleConstant(command: Command): boolean {
  if (command.startLine !== command.endLine) return false;
  if (command.tokens.some((token) => token.kind === 'comment')) return false;
  const code = command.tokens.filter((token) => token.kind !== 'whitespace');
  if (code.length !== 7) return false;
  if (code[0]!.text.toUpperCase() !== 'CONSTANTS') return false;
  if (code[1]!.kind !== 'word') return false;
  if (code[2]!.text.toUpperCase() !== 'TYPE') return false;
  if (code[3]!.kind !== 'word') return false;
  if (code[4]!.text.toUpperCase() !== 'VALUE') return false;
  if (code[5]!.kind !== 'word' && code[5]!.kind !== 'literal') return false;
  return code[6]!.text === '.';
}

function coreText(command: Command): string {
  const first = command.tokens.find((token) => token.kind !== 'whitespace')!;
  const last = command.tokens.at(-1)!;
  return command.tokens
    .slice(command.tokens.indexOf(first), command.tokens.indexOf(last) + 1)
    .map((token) => token.text)
    .join('');
}

function lineIndent(sourceText: string, offset: number): string {
  const lineStart = sourceText.lastIndexOf('\n', offset - 1) + 1;
  return /^[ \t]*/.exec(sourceText.slice(lineStart, offset))![0];
}

function containsStructuredDeclaration(commands: readonly Command[], body: ProcedureBody): boolean {
  for (let index = body.start; index <= body.end; index += 1) {
    const words = commands[index]!.tokens.filter((token) => token.kind === 'word').map((token) => token.text.toUpperCase());
    for (let wordIndex = 0; wordIndex < words.length - 1; wordIndex += 1) {
      if ((words[wordIndex] === 'BEGIN' || words[wordIndex] === 'END') && words[wordIndex + 1] === 'OF') return true;
    }
  }
  return false;
}

function usesDynamicAssign(commands: readonly Command[], body: ProcedureBody): boolean {
  for (let index = body.start; index <= body.end; index += 1) {
    const code = commands[index]!.tokens.filter((token) => token.kind !== 'whitespace');
    if (code[0]?.kind === 'word' && code[0].text.toUpperCase() === 'ASSIGN' && code[1]?.text === '(') return true;
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
      if (openingIndex !== undefined) bodies.push({ start: openingIndex + 1, end: index - 1 });
    }
  }
  return bodies;
}
