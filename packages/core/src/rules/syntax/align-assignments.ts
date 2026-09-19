// Ported from com/sap/adt/abapcleaner/rules/alignment/AlignAssignmentsRule.java @ v1.29.0
//
// Bounded subset: for each maximal run of >=2 consecutive top-level statements that are all simple
// assignments (`<identifier> <op> ... .` where <op> is one of `=`, `+=`, `-=`, `*=`, `/=`, `?=`,
// `&&=`) to the SAME "structure variable" (the text before the identifier's last `-`; an identifier
// with no `-` never has a structure variable and therefore never groups with anything, matching
// upstream exactly — this is why `lv_x = 1.` is never aligned with another plain assignment, only
// `ls_struc-a = 1.` next to `ls_struc-b = 2.`), right-pads the identifier column and right-aligns
// the operator column so the operators line up vertically ("align the '=' and make the '+' stand
// out", per the Clean ABAP styleguide reference this rule cites). Blank lines and comment lines
// between matching assignments do not break a run, matching the upstream defaults
// `AlignAcrossEmptyLines`/`AlignAcrossCommentLines` = true — this falls out for free here since
// this port's statement parser already attaches leading blank lines/comments to the following
// statement rather than giving them their own Command, and comment tokens are simply ignored when
// reading a command's code shape. Any other intervening statement (including one this port doesn't
// classify as "blocked" the way upstream does) breaks the run, since a run is simply array-adjacent
// matching commands on distinct source lines (two matching assignments crammed onto one physical
// line are left unaligned, since alignment is inherently a vertical/cross-line concept). A command
// whose identifier/operator span more than one line, or whose "rest of command" is empty (nothing
// between the operator and the period), is not recognized as a simple assignment and is left out of
// any run.
import { parseAbapCommands, type Command } from '../../parser/commands.js';
import type { Token } from '../../parser/tokenizer.js';

const COMPOUND_OPERATOR_PREFIXES = new Set(['+', '-', '*', '/', '?']);

interface Edit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

interface Assignment {
  readonly identifier: Token;
  readonly opFirst: Token;
  readonly opLast: Token;
  readonly opText: string;
  readonly restFirst: Token;
  readonly structureVariable: string;
}

export function alignAssignmentsToSameStructure(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const assignments = commands.map(parseSimpleAssignment);
  const edits: Edit[] = [];

  let runStart = 0;
  while (runStart < assignments.length) {
    if (assignments[runStart] === undefined) {
      runStart += 1;
      continue;
    }
    let runEnd = runStart;
    while (
      runEnd + 1 < assignments.length
      && assignments[runEnd + 1] !== undefined
      && assignments[runEnd + 1]!.structureVariable === assignments[runStart]!.structureVariable
      && assignments[runEnd + 1]!.identifier.line !== assignments[runEnd]!.identifier.line
    ) {
      runEnd += 1;
    }
    if (runEnd > runStart) edits.push(...alignRun(assignments.slice(runStart, runEnd + 1) as Assignment[]));
    runStart = runEnd + 1;
  }

  return edits.reduceRight((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

function alignRun(run: readonly Assignment[]): Edit[] {
  const maxIdentifierWidth = Math.max(...run.map((assignment) => assignment.identifier.text.length));
  const maxOpWidth = Math.max(...run.map((assignment) => assignment.opText.length));

  return run.flatMap((assignment) => {
    const gap1 = ' '.repeat(maxIdentifierWidth - assignment.identifier.text.length + 1) + ' '.repeat(maxOpWidth - assignment.opText.length);
    const identifierEnd = assignment.identifier.offset + assignment.identifier.text.length;
    const opEnd = assignment.opLast.offset + assignment.opLast.text.length;
    return [
      { start: identifierEnd, end: assignment.opFirst.offset, text: gap1 },
      { start: opEnd, end: assignment.restFirst.offset, text: ' ' },
    ];
  });
}

function parseSimpleAssignment(command: Command): Assignment | undefined {
  const code = command.tokens.filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
  if (code.length < 4) return undefined;

  const identifier = code[0]!;
  if (identifier.kind !== 'word' || !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(identifier.text)) return undefined;
  if (code.at(-1)?.text !== '.') return undefined;

  const dashIndex = identifier.text.lastIndexOf('-');
  if (dashIndex < 0) return undefined;
  const structureVariable = identifier.text.slice(0, dashIndex);

  const operator = parseOperator(code);
  if (operator === undefined) return undefined;
  const restFirst = code[operator.codeIndexAfterOp];
  if (restFirst === undefined || restFirst.text === '.') return undefined;
  if (operator.opLast.line !== identifier.line) return undefined;

  return { identifier, opFirst: operator.opFirst, opLast: operator.opLast, opText: operator.opText, restFirst, structureVariable };
}

function parseOperator(code: readonly Token[]): { readonly opFirst: Token; readonly opLast: Token; readonly opText: string; readonly codeIndexAfterOp: number } | undefined {
  const first = code[1]!;
  if (first.text === '=' || first.text === '&&=') {
    return { opFirst: first, opLast: first, opText: first.text, codeIndexAfterOp: 2 };
  }
  const second = code[2];
  if (first.kind === 'word' && COMPOUND_OPERATOR_PREFIXES.has(first.text) && second?.text === '=' && isAdjacent(first, second)) {
    return { opFirst: first, opLast: second, opText: `${first.text}=`, codeIndexAfterOp: 3 };
  }
  return undefined;
}

function isAdjacent(first: Token, second: Token): boolean {
  return first.offset + first.text.length === second.offset;
}
