import { parseAbapCommands, type Command } from '../../parser/commands.js';

export function removeInitialScalarClears(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const replacements: { readonly start: number; readonly end: number }[] = [];
  for (let index = 1; index < commands.length; index += 1) {
    const variableName = declaredScalarName(commands[index - 1]!);
    const clearName = simpleClearName(commands[index]!);
    if (variableName !== undefined && clearName !== undefined && variableName.toUpperCase() === clearName.toUpperCase()) {
      replacements.push({ start: commands[index]!.startOffset, end: commands[index]!.endOffset });
    }
  }
  return replacements.reduceRight((text, replacement) => text.slice(0, replacement.start) + text.slice(replacement.end), sourceText);
}

function declaredScalarName(command: Command): string | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const words = command.tokens.filter((token) => token.kind === 'word');
  return words.length === 4 && words[0]?.text.toUpperCase() === 'DATA' && words[2]?.text.toUpperCase() === 'TYPE' && /^(STRING|C|N|I|INT\d+|CHAR\d+)$/i.test(words[3]?.text ?? '') ? words[1]?.text : undefined;
}

function simpleClearName(command: Command): string | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const code = command.tokens.filter((token) => token.kind !== 'whitespace');
  return code.length === 3 && code[0]?.text.toUpperCase() === 'CLEAR' && code[1]?.kind === 'word' && code[2]?.text === '.' ? code[1].text : undefined;
}