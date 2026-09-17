import { parseAbapCommands, type Command } from '../../parser/commands.js';
import type { Token } from '../../parser/tokenizer.js';

const KEYWORDS = new Set(['IF', 'ELSEIF', 'WHILE', 'CHECK']);

export function removeSimpleLogicalParentheses(sourceText: string): string {
  const replacements: { readonly start: number; readonly end: number; readonly text: string }[] = [];
  for (const command of parseAbapCommands(sourceText)) {
    const match = simpleOuterParentheses(command);
    if (match !== undefined) replacements.push(match);
  }
  return replacements.reduceRight((text, replacement) => text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end), sourceText);
}

function simpleOuterParentheses(command: Command): { readonly start: number; readonly end: number; readonly text: string } | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const code = command.tokens.filter((token) => token.kind !== 'whitespace');
  if (!isWord(code[0]) || !KEYWORDS.has(code[0].text.toUpperCase()) || code[1]?.text !== '(' || code.at(-2)?.text !== ')' || code.at(-1)?.text !== '.') return undefined;
  const inner = code.slice(2, -2);
  if (!isSimpleInitialPredicate(inner)) return undefined;
  const opening = code[1]!;
  const closing = code.at(-2)!;
  return { start: opening.offset, end: closing.offset + closing.text.length, text: sourceSlice(command, opening.offset + 1, closing.offset).trim() };
}

function isSimpleInitialPredicate(tokens: readonly Token[]): boolean {
  return (tokens.length === 3 && tokens[0]?.kind === 'word' && isWord(tokens[1], 'IS') && isWord(tokens[2], 'INITIAL'))
    || (tokens.length === 4 && tokens[0]?.kind === 'word' && isWord(tokens[1], 'IS') && isWord(tokens[2], 'NOT') && isWord(tokens[3], 'INITIAL'));
}

function sourceSlice(command: Command, start: number, end: number): string {
  return command.tokens.filter((token) => token.offset >= start && token.offset < end).map((token) => token.text).join('');
}

function isWord(token: Token | undefined, text?: string): token is Token {
  return token?.kind === 'word' && (text === undefined || token.text.toUpperCase() === text);
}