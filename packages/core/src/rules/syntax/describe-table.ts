import { parseAbapCommands, type Command } from '../../parser/commands.js';

export function replaceTerminalDescribeTableLines(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const replacements: { readonly start: number; readonly end: number; readonly text: string }[] = [];
  for (let index = 0; index + 1 < commands.length; index += 1) {
    const match = simpleDescribeTableLines(commands[index]!);
    if (match === undefined || !isBareReturn(commands[index + 1]!)) continue;
    replacements.push({ start: commands[index]!.startOffset, end: commands[index]!.endOffset, text: `${match.target} = lines( ${match.table} ).` });
  }
  return replacements.reduceRight((text, replacement) => text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end), sourceText);
}

function simpleDescribeTableLines(command: Command): { readonly table: string; readonly target: string } | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const code = command.tokens.filter((token) => token.kind !== 'whitespace');
  if (code[0]?.text.toUpperCase() !== 'DESCRIBE' || code[1]?.text.toUpperCase() !== 'TABLE' || code[2]?.kind !== 'word' || code[3]?.text.toUpperCase() !== 'LINES') return undefined;
  const target = simpleTarget(code.slice(4));
  return target === undefined ? undefined : { table: code[2].text, target };
}

function simpleTarget(code: readonly Command['tokens'][number][]): string | undefined {
  if (code.length === 2 && code[0]?.kind === 'word' && code[1]?.text === '.' && !code[0].text.toUpperCase().startsWith('SY-')) return code[0].text;
  if (code.length === 5 && code[0]?.kind === 'word' && (code[0].text.toUpperCase() === 'DATA' || code[0].text.toUpperCase() === 'FINAL') && code[1]?.text === '(' && code[2]?.kind === 'word' && code[3]?.text === ')' && code[4]?.text === '.') return `${code[0].text}(${code[2].text})`;
  return undefined;
}

function isBareReturn(command: Command): boolean {
  const code = command.tokens.filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
  return code.length === 2 && code[0]?.text.toUpperCase() === 'RETURN' && code[1]?.text === '.';
}