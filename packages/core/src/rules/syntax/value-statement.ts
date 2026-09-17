import { parseAbapStatements, type Statement } from '../../parser/statements.js';

export function shortenSimpleValueStatements(sourceText: string): string {
  const replacements = parseAbapStatements(sourceText)
    .map((statement) => shortenSimpleValueStatement(statement))
    .filter((replacement): replacement is Replacement => replacement !== undefined);

  return replacements.reduceRight((result, replacement) =>
    `${result.slice(0, replacement.start)}${replacement.text}${result.slice(replacement.end)}`, sourceText);
}

interface Replacement {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

function shortenSimpleValueStatement(statement: Statement): Replacement | undefined {
  if (statement.startLine !== statement.endLine || statement.tokens.some((token) => token.kind === 'comment')) return undefined;
  const code = statement.tokens.filter((token) => token.kind !== 'whitespace');
  if (code.length !== 23 || !isIdentifier(code[0]?.text) || code[1]?.text !== '=' || !isWord(code[2]?.text, 'VALUE') || code[3]?.text !== '#' || code[4]?.text !== '(' || code[5]?.text !== '(' || !isIdentifier(code[6]?.text) || code[7]?.text !== '=' || !isScalar(code[8]?.kind) || !isIdentifier(code[9]?.text) || code[10]?.text !== '=' || !isScalar(code[11]?.kind) || code[12]?.text !== ')' || code[13]?.text !== '(' || code[14]?.text !== code[6]?.text || code[15]?.text !== '=' || code[16]?.text !== code[8]?.text || code[17]?.text !== code[9]?.text || code[18]?.text !== '=' || !isScalar(code[19]?.kind) || code[20]?.text !== ')' || code[21]?.text !== ')' || code[22]?.text !== '.') return undefined;

  return {
    start: code[0]!.offset,
    end: code[22]!.offset + 1,
    text: `${code[0]!.text} = VALUE #( ${code[6]!.text} = ${code[8]!.text} ( ${code[9]!.text} = ${code[11]!.text} ) ( ${code[17]!.text} = ${code[19]!.text} ) ).`,
  };
}

function isWord(text: string | undefined, expected: string): boolean {
  return text?.toUpperCase() === expected;
}

function isIdentifier(text: string | undefined): boolean {
  return text !== undefined && /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
}

function isScalar(kind: string | undefined): boolean {
  return kind === 'word' || kind === 'literal';
}