import { parseAbapStatements, type Statement } from '../../parser/statements.js';

export function replaceSimpleReadTableAssigning(sourceText: string): string {
  const replacements = parseAbapStatements(sourceText)
    .map((statement) => simpleReadTableAssigning(statement))
    .filter((replacement): replacement is Replacement => replacement !== undefined);

  return replacements.reduceRight((result, replacement) =>
    `${result.slice(0, replacement.start)}${replacement.text}${result.slice(replacement.end)}`, sourceText);
}

interface Replacement {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

function simpleReadTableAssigning(statement: Statement): Replacement | undefined {
  if (statement.startLine !== statement.endLine || statement.tokens.some((token) => token.kind === 'comment')) return undefined;
  const code = statement.tokens.filter((token) => token.kind !== 'whitespace');
  if (code.length !== 13 || !isWord(code[0]?.text, 'READ') || !isWord(code[1]?.text, 'TABLE') || !isPlainIdentifier(code[2]?.text) || !isWord(code[3]?.text, 'WITH') || !isWord(code[4]?.text, 'KEY') || !isPlainIdentifier(code[5]?.text) || code[6]?.text !== '=' || !isOperand(code[7]?.text) || !isWord(code[8]?.text, 'ASSIGNING') || code[9]?.text !== '<' || !isPlainIdentifier(code[10]?.text) || code[11]?.text !== '>' || code[12]?.text !== '.') return undefined;

  return {
    start: code[0]!.offset,
    end: code[12]!.offset + 1,
    text: `ASSIGN ${code[2]!.text}[ ${code[5]!.text} = ${code[7]!.text} ] TO <${code[10]!.text}>.`,
  };
}

function isWord(text: string | undefined, expected: string): boolean {
  return text?.toUpperCase() === expected;
}

function isPlainIdentifier(text: string | undefined): boolean {
  return text !== undefined && /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
}

function isOperand(text: string | undefined): boolean {
  return isPlainIdentifier(text) || /^\d+$/.test(text ?? '');
}