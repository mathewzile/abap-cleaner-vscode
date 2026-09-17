import { parseAbapCommands, type Command } from '../../parser/commands.js';

export function replaceDeclaredCondense(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const replacements: { readonly start: number; readonly end: number; readonly text: string }[] = [];
  for (let index = 1; index < commands.length; index += 1) {
    const variableName = declaredScalarName(commands[index - 1]!);
    const noGaps = condenseNoGaps(commands[index]!);
    if (variableName === undefined || noGaps === undefined || variableName.toUpperCase() !== noGaps.name.toUpperCase()) continue;
    const parameters = noGaps.noGaps ? `val = ${noGaps.name} to = \`\` from = \` \`` : noGaps.name;
    replacements.push({ start: commands[index]!.startOffset, end: commands[index]!.endOffset, text: `${noGaps.name} = condense( ${parameters} ).` });
  }
  return replacements.reduceRight((text, replacement) => text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end), sourceText);
}

function declaredScalarName(command: Command): string | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const words = command.tokens.filter((token) => token.kind === 'word');
  return words.length === 4 && words[0]?.text.toUpperCase() === 'DATA' && words[2]?.text.toUpperCase() === 'TYPE' && /^(STRING|C|N|CHAR\d+)$/i.test(words[3]?.text ?? '') ? words[1]?.text : undefined;
}

function condenseNoGaps(command: Command): { readonly name: string; readonly noGaps: boolean } | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const words = command.tokens.filter((token) => token.kind === 'word');
  if (words[0]?.text.toUpperCase() !== 'CONDENSE' || words[1]?.kind !== 'word') return undefined;
  if (words.length === 2) return { name: words[1].text, noGaps: false };
  return words.length === 3 && words[2]?.text.toUpperCase() === 'NO-GAPS' ? { name: words[1].text, noGaps: true } : undefined;
}