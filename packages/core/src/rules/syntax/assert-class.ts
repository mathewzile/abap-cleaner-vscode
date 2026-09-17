import { parseAbapCommands, type Command } from '../../parser/commands.js';

export function replaceSimpleAssertWithClass(sourceText: string, assertClassName: string): string {
  const replacements: { readonly start: number; readonly end: number; readonly text: string }[] = [];
  for (const command of parseAbapCommands(sourceText)) {
    const match = simpleAssert(command);
    if (match !== undefined) replacements.push({ start: command.startOffset, end: command.endOffset, text: `${assertClassName}=>${match.method}(${match.operand === '' ? '' : ` ${match.operand} `}).` });
  }
  return replacements.reduceRight((text, replacement) => text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end), sourceText);
}

function simpleAssert(command: Command): { readonly operand: string; readonly method: string } | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const code = command.tokens.filter((token) => token.kind !== 'whitespace');
  if (code[0]?.text.toUpperCase() !== 'ASSERT' || code.at(-1)?.text !== '.') return undefined;
  if (code.length === 5 && isScalar(code[1]) && (code[2]?.text === '=' || code[2]?.text === '<>') && isScalar(code[3])) {
    if (code[2]!.text === '<>') return { operand: `act = ${code[1]!.text} exp = ${code[3]!.text}`, method: 'assert_differs' };
    if (code[1]!.text.toUpperCase() === 'SY-SUBRC') {
      return code[3]!.text === '0'
        ? { operand: '', method: 'assert_subrc' }
        : { operand: `exp = ${code[3]!.text}`, method: 'assert_subrc' };
    }
    const booleanValue = code[3]!.text.toUpperCase();
    if (booleanValue === 'ABAP_TRUE' || booleanValue === 'ABAP_FALSE') {
      return { operand: code[1]!.text, method: booleanValue === 'ABAP_TRUE' ? 'assert_true' : 'assert_false' };
    }
    return { operand: `act = ${code[1]!.text} exp = ${code[3]!.text}`, method: 'assert_equals' };
  }
  const hasLeadingNot = code[1]?.text.toUpperCase() === 'NOT';
  const operandIndex = hasLeadingNot ? 2 : 1;
  if (code[operandIndex]?.kind !== 'word' || code[operandIndex + 1]?.text.toUpperCase() !== 'IS') return undefined;
  const attribute = code.slice(operandIndex + 2, -1).map((token) => token.text.toUpperCase()).join(' ');
  const positiveMethod = attribute === 'BOUND' ? 'assert_bound'
    : attribute === 'NOT BOUND' ? 'assert_not_bound'
      : attribute === 'INITIAL' ? 'assert_initial'
        : attribute === 'NOT INITIAL' ? 'assert_not_initial'
          : undefined;
  if (positiveMethod === undefined) return undefined;
  const method = hasLeadingNot
    ? positiveMethod === 'assert_bound' ? 'assert_not_bound'
      : positiveMethod === 'assert_not_bound' ? 'assert_bound'
        : positiveMethod === 'assert_initial' ? 'assert_not_initial'
          : 'assert_initial'
    : positiveMethod;
  return { operand: code[operandIndex]!.text, method };
}

function isScalar(token: Command['tokens'][number] | undefined): boolean {
  return token?.kind === 'word' || token?.kind === 'literal';
}