import { parseAbapStatements, type Statement } from '../../parser/statements.js';

export function normalizeSimpleClassDefinitionOptions(sourceText: string): string {
  const replacements = parseAbapStatements(sourceText)
    .map((statement) => normalizeSimpleClassDefinition(statement))
    .filter((replacement): replacement is Replacement => replacement !== undefined);

  return replacements.reduceRight((result, replacement) =>
    `${result.slice(0, replacement.start)}${replacement.text}${result.slice(replacement.end)}`, sourceText);
}

interface Replacement {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

function normalizeSimpleClassDefinition(statement: Statement): Replacement | undefined {
  if (statement.startLine !== statement.endLine || statement.tokens.some((token) => token.kind === 'comment')) return undefined;
  const code = statement.tokens.filter((token) => token.kind !== 'whitespace');
  if (code.length !== 6 || code[0]?.text.toUpperCase() !== 'CLASS' || !isPlainIdentifier(code[1]?.text) || code[2]?.text.toUpperCase() !== 'DEFINITION' || code[3]?.text.toUpperCase() !== 'FINAL' || code[4]?.text.toUpperCase() !== 'PUBLIC' || code[5]?.text !== '.') return undefined;
  return { start: code[3]!.offset, end: code[4]!.offset + code[4]!.text.length, text: `${code[4]!.text} ${code[3]!.text}` };
}

function isPlainIdentifier(text: string | undefined): boolean {
  return text !== undefined && /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
}