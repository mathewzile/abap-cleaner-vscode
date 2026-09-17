import { parseAbapStatements, type Statement } from '../../parser/statements.js';

export function unchainSimpleDeclarations(sourceText: string): string {
  const replacements = parseAbapStatements(sourceText)
    .map((statement) => unchainSimpleDeclaration(sourceText, statement))
    .filter((replacement): replacement is Replacement => replacement !== undefined);

  return replacements.reduceRight((result, replacement) =>
    `${result.slice(0, replacement.start)}${replacement.text}${result.slice(replacement.end)}`, sourceText);
}

interface Replacement {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

function unchainSimpleDeclaration(sourceText: string, statement: Statement): Replacement | undefined {
  if (statement.startLine !== statement.endLine || statement.tokens.some((token) => token.kind === 'comment')) return undefined;
  const code = statement.tokens.filter((token) => token.kind !== 'whitespace');
  if (code.length !== 10 || !isDeclarationKeyword(code[0]?.text) || code[1]?.text !== ':' || code[2]?.kind !== 'word' || code[3]?.text.toUpperCase() !== 'TYPE' || code[4]?.kind !== 'word' || code[5]?.text !== ',' || code[6]?.kind !== 'word' || code[7]?.text.toUpperCase() !== 'TYPE' || code[8]?.kind !== 'word' || code[9]?.text !== '.') return undefined;

  const first = code[0]!;
  const lineStart = sourceText.lastIndexOf('\n', first.offset - 1) + 1;
  const indent = sourceText.slice(lineStart, first.offset);
  const keyword = first.text;
  return {
    start: first.offset,
    end: code[9]!.offset + 1,
    text: `${keyword} ${code[2]!.text} TYPE ${code[4]!.text}.\n${indent}${keyword} ${code[6]!.text} TYPE ${code[8]!.text}.`,
  };
}

function isDeclarationKeyword(text: string | undefined): boolean {
  const keyword = text?.toUpperCase();
  return keyword === 'DATA' || keyword === 'TYPES';
}