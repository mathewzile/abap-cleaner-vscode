import { parseAbapCommands, type Command } from '../../parser/commands.js';

export function replaceDeclaredTranslateCase(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const replacements: { readonly start: number; readonly end: number; readonly text: string }[] = [];
  for (let index = 1; index < commands.length; index += 1) {
    const variableName = declaredScalarName(commands[index - 1]!);
    const direction = translateDirection(commands[index]!);
    if (variableName === undefined || direction === undefined || variableName.toUpperCase() !== direction.name.toUpperCase()) continue;
    replacements.push({ start: commands[index]!.startOffset, end: commands[index]!.endOffset, text: `${direction.name} = to_${direction.direction}( ${direction.name} ).` });
  }
  return replacements.reduceRight((text, replacement) => text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end), sourceText);
}

function declaredScalarName(command: Command): string | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const words = command.tokens.filter((token) => token.kind === 'word');
  return words.length === 4 && words[0]?.text.toUpperCase() === 'DATA' && words[2]?.text.toUpperCase() === 'TYPE' && /^(STRING|C|N|CHAR\d+)$/i.test(words[3]?.text ?? '') ? words[1]?.text : undefined;
}

function translateDirection(command: Command): { readonly name: string; readonly direction: 'upper' | 'lower' } | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const words = command.tokens.filter((token) => token.kind === 'word');
  if (words.length !== 5 || words[0]?.text.toUpperCase() !== 'TRANSLATE' || words[2]?.text.toUpperCase() !== 'TO' || words[4]?.text.toUpperCase() !== 'CASE') return undefined;
  const direction = words[3]?.text.toLowerCase();
  return direction === 'upper' || direction === 'lower' ? { name: words[1]!.text, direction } : undefined;
}