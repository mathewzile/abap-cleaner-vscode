import { tokenize, type Token } from './tokenizer.js';

export interface Statement {
  readonly rangeStartLine: number;
  readonly startLine: number;
  readonly endLine: number;
  readonly tokens: readonly Token[];
}

export function parseAbapStatements(sourceText: string): readonly Statement[] {
  const statements: Statement[] = [];
  let current: Token[] = [];
  const tokens = tokenize(sourceText, 'ABAP');
  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
    const token = tokens[tokenIndex]!;
    current.push(token);
    if (token.text === '.' && isStatementTerminator(current, tokens[tokenIndex + 1])) {
      tokenIndex = appendTrailingComment(current, tokens, tokenIndex);
      statements.push({ rangeStartLine: firstContentLine(current), startLine: firstCodeLine(current), endLine: current.at(-1)!.line, tokens: current });
      current = [];
    }
  }
  if (current.some((token) => token.kind !== 'whitespace' && token.kind !== 'comment')) {
    statements.push({ rangeStartLine: firstContentLine(current), startLine: firstCodeLine(current), endLine: current.at(-1)!.line, tokens: current });
  }
  return statements;
}

function isStatementTerminator(tokens: readonly Token[], next: Token | undefined): boolean {
  const periodIndex = tokens.length - 1;
  const previous = tokens[periodIndex - 1];
  return !(previous?.kind === 'word' && /\d$/.test(previous.text) && next?.kind === 'word' && /^\d/.test(next.text));
}

function appendTrailingComment(tokens: Token[], allTokens: readonly Token[], periodIndex: number): number {
  let tokenIndex = periodIndex + 1;
  while (allTokens[tokenIndex]?.kind === 'whitespace') tokenIndex += 1;
  const comment = allTokens[tokenIndex];
  if (comment?.kind !== 'comment' || comment.line !== allTokens[periodIndex]!.line) return periodIndex;
  tokens.push(...allTokens.slice(periodIndex + 1, tokenIndex + 1));
  return tokenIndex;
}

export function selectAbapStatements(
  sourceText: string,
  startLine: number,
  endLine: number,
): readonly Statement[] {
  return parseAbapStatements(sourceText).filter((statement) =>
    statement.endLine >= startLine && statement.rangeStartLine <= endLine,
  );
}

function firstContentLine(tokens: readonly Token[]): number {
  return tokens.find((token) => token.kind !== 'whitespace')!.line;
}

function firstCodeLine(tokens: readonly Token[]): number {
  return tokens.find((token) => token.kind !== 'whitespace' && token.kind !== 'comment')!.line;
}
