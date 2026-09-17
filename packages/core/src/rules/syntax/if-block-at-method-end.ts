import { findControlBlockPairs } from '../../parser/control-blocks.js';
import { parseAbapCommands, type Command } from '../../parser/commands.js';
import type { Token } from '../../parser/tokenizer.js';

export function replaceSimpleIfBlockAtMethodEnd(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const pairs = findControlBlockPairs(commands);
  const replacements: Replacement[] = [];

  for (const pair of pairs) {
    if (pair.kind !== 'if' || pair.closingCommandIndex !== pair.openingCommandIndex + 2) continue;
    const ifCommand = commands[pair.openingCommandIndex]!;
    const bodyCommand = commands[pair.openingCommandIndex + 1]!;
    const methodEnd = commands[pair.closingCommandIndex + 1];
    const operand = simpleInitialIfOperand(ifCommand);
    if (operand === undefined || methodEnd?.kind !== 'method-close' || bodyCommand.startLine !== bodyCommand.endLine || bodyCommand.tokens.some((token) => token.kind === 'comment')) continue;
    const ifIndent = indentationBefore(sourceText, ifCommand.startOffset);
    const bodyIndent = indentationBefore(sourceText, bodyCommand.startOffset);
    if (bodyIndent !== `${ifIndent}  `) continue;
    const bodyText = sourceText.slice(bodyCommand.startOffset, bodyCommand.endOffset);
    const lineSeparator = sourceText.includes('\r\n') ? '\r\n' : '\n';
    replacements.push({
      start: ifCommand.startOffset,
      end: commands[pair.closingCommandIndex]!.endOffset,
      text: `IF ${operand} IS NOT INITIAL.${lineSeparator}${ifIndent}  RETURN.${lineSeparator}${ifIndent}ENDIF.${lineSeparator}${ifIndent}${bodyText}`,
    });
  }

  return replacements.reduceRight((result, replacement) =>
    `${result.slice(0, replacement.start)}${replacement.text}${result.slice(replacement.end)}`, sourceText);
}

interface Replacement {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

function simpleInitialIfOperand(command: Command): string | undefined {
  if (command.startLine !== command.endLine || command.tokens.some((token) => token.kind === 'comment')) return undefined;
  const code = command.tokens.filter((token) => token.kind !== 'whitespace');
  return isWord(code[0], 'IF') && isPlainIdentifier(code[1]?.text) && isWord(code[2], 'IS') && isWord(code[3], 'INITIAL') && code[4]?.text === '.' && code.length === 5
    ? code[1]!.text
    : undefined;
}

function indentationBefore(sourceText: string, offset: number): string {
  return sourceText.slice(sourceText.lastIndexOf('\n', offset - 1) + 1, offset);
}

function isWord(token: Token | undefined, expected: string): boolean {
  return token?.kind === 'word' && token.text.toUpperCase() === expected;
}

function isPlainIdentifier(text: string | undefined): text is string {
  return text !== undefined && /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
}