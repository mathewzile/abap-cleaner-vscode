import { parseAbapStatements, type Statement } from '../../parser/statements.js';

export function moveSimpleCommandsToOwnLines(sourceText: string): string {
  const statements = parseAbapStatements(sourceText);
  const replacements: { readonly start: number; readonly end: number; readonly text: string }[] = [];

  for (let index = 1; index < statements.length; index += 1) {
    const previous = statements[index - 1]!;
    const current = statements[index]!;
    const replacement = commandSeparatorReplacement(sourceText, previous, current);
    if (replacement !== undefined) replacements.push(replacement);
  }

  return replacements.reduceRight((result, replacement) =>
    `${result.slice(0, replacement.start)}${replacement.text}${result.slice(replacement.end)}`, sourceText);
}

function commandSeparatorReplacement(sourceText: string, previous: Statement, current: Statement): { readonly start: number; readonly end: number; readonly text: string } | undefined {
  if (previous.startLine !== previous.endLine || current.startLine !== current.endLine || previous.endLine !== current.startLine) return undefined;
  if (previous.tokens.some((token) => token.kind === 'comment') || current.tokens.some((token) => token.kind === 'comment')) return undefined;
  if (firstCodeWord(previous)?.toUpperCase() === 'WHEN') return undefined;

  const previousEnd = lastNonWhitespaceToken(previous);
  const currentStart = current.tokens.find((token) => token.kind !== 'whitespace');
  if (previousEnd === undefined || currentStart === undefined || previousEnd.text !== '.' || currentStart.kind !== 'word') return undefined;
  const separator = sourceText.slice(previousEnd.offset + 1, currentStart.offset);
  if (!/^[ \t]+$/.test(separator)) return undefined;

  const lineStart = sourceText.lastIndexOf('\n', currentStart.offset - 1) + 1;
  const indent = sourceText.slice(lineStart, currentStart.offset).match(/^[ \t]*/)?.[0] ?? '';
  return { start: previousEnd.offset + 1, end: currentStart.offset, text: `\n${indent}` };
}

function firstCodeWord(statement: Statement): string | undefined {
  return statement.tokens.find((token) => token.kind === 'word')?.text;
}

function lastNonWhitespaceToken(statement: Statement): Statement['tokens'][number] | undefined {
  for (let index = statement.tokens.length - 1; index >= 0; index -= 1) {
    const token = statement.tokens[index]!;
    if (token.kind !== 'whitespace') return token;
  }
  return undefined;
}