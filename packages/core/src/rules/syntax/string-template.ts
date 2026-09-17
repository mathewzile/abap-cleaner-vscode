import { parseAbapCommands, type Command } from '../../parser/commands.js';

export function replaceSimpleStringConcatenations(sourceText: string): string {
  const replacements: { readonly start: number; readonly end: number; readonly text: string }[] = [];
  for (const command of parseAbapCommands(sourceText)) {
    const match = simpleStringConcatenation(command);
    if (match !== undefined) replacements.push({ start: command.startOffset, end: command.endOffset, text: match });
  }
  return replacements.reduceRight((text, replacement) => text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end), sourceText);
}

function simpleStringConcatenation(command: Command): string | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const code = command.tokens.filter((token) => token.kind !== 'whitespace');
  if (code.length !== 6 || code[0]?.kind !== 'word' || code[1]?.text !== '=' || code[3]?.text !== '&&' || code[5]?.text !== '.') return undefined;
  if (code[2]?.kind === 'literal' && code[4]?.kind === 'literal') {
    const firstContent = safeBacktickContent(code[2]!.text);
    const secondContent = safeBacktickContent(code[4]!.text);
    return firstContent === undefined || secondContent === undefined ? undefined : `${code[0]!.text} = |${firstContent}${secondContent}|.`;
  }
  const literalIndex = code[2]?.kind === 'literal' && code[4]?.kind === 'word' ? 2 : code[2]?.kind === 'word' && code[4]?.kind === 'literal' ? 4 : undefined;
  if (literalIndex === undefined) return undefined;
  const identifierIndex = literalIndex === 2 ? 4 : 2;
  const content = safeBacktickContent(code[literalIndex]!.text);
  if (content === undefined) return undefined;
  const embedding = `{ ${code[identifierIndex]!.text} }`;
  return `${code[0]!.text} = |${literalIndex === 2 ? `${content}${embedding}` : `${embedding}${content}`}|.`;
}

function safeBacktickContent(literal: string): string | undefined {
  if (!literal.startsWith('`') || !literal.endsWith('`')) return undefined;
  const content = literal.slice(1, -1);
  return content.includes('`') || /[|{}]/.test(content) ? undefined : content;
}