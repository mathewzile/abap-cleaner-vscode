import { tokenize, type Token } from '../../parser/tokenizer.js';

export interface ChainOfOneOptions {
  readonly processSimpleChains: boolean;
}

export function simplifyChainOfOne(sourceText: string, { processSimpleChains }: ChainOfOneOptions): string {
  if (!processSimpleChains) return sourceText;
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.text === ':' && isSimpleChainOfOne(tokens, index)) {
      continue;
    }
    output.push(token.text);
  }
  return output.join('');
}

function isSimpleChainOfOne(tokens: readonly Token[], colonIndex: number): boolean {
  const statementStart = findStatementStart(tokens, colonIndex);
  const statementEnd = findStatementEnd(tokens, colonIndex);
  if (statementStart === colonIndex || statementEnd < colonIndex) return false;
  const statement = tokens.slice(statementStart, statementEnd + 1);
  const lineEndComment = nextNonWhitespace(tokens, statementEnd + 1);
  return statement.every((token) => token.kind !== 'comment' && !token.text.includes('\n'))
    && statement.filter((token) => token.text === ':').length === 1
    && !statement.some((token) => token.text === ',')
    && !statement.some((token) => '(){}[]'.includes(token.text))
    && !(lineEndComment?.kind === 'comment' && lineEndComment.line === tokens[statementEnd]!.line);
}

function nextNonWhitespace(tokens: readonly Token[], index: number): Token | undefined {
  let cursor = index;
  while (tokens[cursor]?.kind === 'whitespace') cursor += 1;
  return tokens[cursor];
}

function findStatementStart(tokens: readonly Token[], index: number): number {
  let cursor = index - 1;
  while (cursor >= 0 && tokens[cursor]!.text !== '.') cursor -= 1;
  return cursor + 1;
}

function findStatementEnd(tokens: readonly Token[], index: number): number {
  let cursor = index + 1;
  while (cursor < tokens.length && tokens[cursor]!.text !== '.') cursor += 1;
  return cursor < tokens.length ? cursor : -1;
}