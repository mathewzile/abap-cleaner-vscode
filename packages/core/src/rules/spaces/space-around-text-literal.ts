import { tokenize, type Token } from '../../parser/tokenizer.js';

export interface SpaceAroundTextLiteralOptions {
  readonly separateFromKeywords?: boolean;
  readonly separateFromOperators?: boolean;
  readonly separateFromComments?: boolean;
}

const KEYWORDS = new Set(['ASSERT', 'EQ', 'NE', 'LT', 'LE', 'GT', 'GE', 'VALUE', 'WHEN', 'THEN', 'ELSE', 'WHERE', 'AND', 'OR', 'NOT']);
const OPERATORS = /^(?:=|=>|=:|&&|<=|>=|<>|<|>|\+|-|\*|\/|,|:)$/;

export function normalizeTextLiteralSpacing(sourceText: string, options: SpaceAroundTextLiteralOptions = {}): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.kind === 'literal') {
      addSpaceBeforeLiteral(output, previousToken(tokens, index), options);
    }
    output.push(token.text);
    if (token.kind === 'literal' && options.separateFromComments !== false && tokens[index + 1]?.kind === 'comment') {
      output.push(' ');
    }
  }

  return output.join('');
}

function addSpaceBeforeLiteral(output: string[], previous: Token | undefined, options: SpaceAroundTextLiteralOptions): void {
  if (!previous || previous.kind === 'whitespace' || previous.kind === 'comment') {
    return;
  }
  if (isKeyword(previous) && options.separateFromKeywords !== false) {
    output.push(' ');
  } else if (isOperator(previous) && options.separateFromOperators !== false) {
    output.push(' ');
  }
}

function previousToken(tokens: readonly Token[], index: number): Token | undefined {
  return tokens[index - 1];
}

function isKeyword(token: Token): boolean {
  return token.kind === 'word' && KEYWORDS.has(token.text.toUpperCase());
}

function isOperator(token: Token): boolean {
  return OPERATORS.test(token.text);
}
