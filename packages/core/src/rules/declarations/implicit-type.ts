import { parseAbapCommands, type Command } from '../../parser/commands.js';

export function makeSimpleImplicitTypesExplicit(sourceText: string): string {
  const replacements: { readonly start: number; readonly end: number; readonly text: string }[] = [];
  for (const command of parseAbapCommands(sourceText)) {
    const replacement = simpleDataLength(command);
    if (replacement !== undefined) replacements.push({ start: command.startOffset, end: command.endOffset, text: replacement });
  }
  return replacements.reduceRight((text, replacement) => text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end), sourceText);
}

function simpleDataLength(command: Command): string | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const code = command.tokens.filter((token) => token.kind !== 'whitespace');
  const declarationKeyword = code[0]?.text.toUpperCase();
  if (declarationKeyword !== 'DATA' && declarationKeyword !== 'TYPES') return undefined;
  if (code.length === 3 && code[1]?.kind === 'word' && code[2]?.text === '.') return `${declarationKeyword} ${code[1].text} TYPE c.`;
  if (code.length !== 6 || code[1]?.kind !== 'word' || code[2]?.text !== '(' || code[3]?.kind !== 'word' || code[4]?.text !== ')' || code[5]?.text !== '.') return undefined;
  if (!/^[1-9]\d*$/.test(code[3]!.text)) return undefined;
  return `${declarationKeyword} ${code[1]!.text} TYPE c LENGTH ${code[3]!.text}.`;
}