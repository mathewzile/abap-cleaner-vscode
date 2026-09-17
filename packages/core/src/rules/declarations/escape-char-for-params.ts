import { parseAbapCommands, type Command } from '../../parser/commands.js';

const CRITICAL_PARAMETER_NAMES = new Set(['EXPORTING', 'CHANGING', 'RAISING', 'EXCEPTIONS', 'DEFAULT', 'OPTIONAL', 'PREFERRED']);

export function removeSimpleParameterEscapeCharacters(sourceText: string): string {
  const replacements: { readonly start: number; readonly end: number; readonly text: string }[] = [];
  for (const command of parseAbapCommands(sourceText)) {
    const replacement = simpleParameterEscape(command);
    if (replacement !== undefined) replacements.push(replacement);
  }
  return replacements.reduceRight((text, replacement) => text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end), sourceText);
}

function simpleParameterEscape(command: Command): { readonly start: number; readonly end: number; readonly text: string } | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const code = command.tokens.filter((token) => token.kind !== 'whitespace');
  if (code[0]?.text.toUpperCase() !== 'METHODS' || code[1]?.kind !== 'word' || code[2]?.text.toUpperCase() !== 'IMPORTING' || code.at(-1)?.text !== '.') return undefined;
  const escaped = code[3]?.text === '!';
  const parameterIndex = escaped ? 4 : 3;
  const typeIndex = parameterIndex + 1;
  if (code.length !== (escaped ? 8 : 7) || code[parameterIndex]?.kind !== 'word' || code[typeIndex]?.text.toUpperCase() !== 'TYPE' || code[typeIndex + 1]?.kind !== 'word') return undefined;
  const parameter = code[parameterIndex]!;
  const critical = CRITICAL_PARAMETER_NAMES.has(parameter.text.toUpperCase());
  if (escaped && !critical) return { start: code[3]!.offset, end: parameter.offset + parameter.text.length, text: parameter.text };
  if (!escaped && critical) return { start: parameter.offset, end: parameter.offset + parameter.text.length, text: `!${parameter.text}` };
  return undefined;
}