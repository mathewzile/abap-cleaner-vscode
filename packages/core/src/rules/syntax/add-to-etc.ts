import { tokenize, type Token } from '../../parser/tokenizer.js';

const OPERATIONS: Readonly<Record<string, { readonly connector: string; readonly operator: string; readonly destinationFirst: boolean }>> = {
  ADD: { connector: 'TO', operator: '+=', destinationFirst: false },
  SUBTRACT: { connector: 'FROM', operator: '-=', destinationFirst: false },
  MULTIPLY: { connector: 'BY', operator: '*=', destinationFirst: true },
  DIVIDE: { connector: 'BY', operator: '/=', destinationFirst: true },
};

export function replaceSimpleAddToEtc(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const match = simpleObsoleteCalculationStatement(tokens, index);
    if (match === undefined) {
      output.push(tokens[index]!.text);
      continue;
    }
    output.push(match.replacement);
    index = match.lastRemovedIndex;
  }
  return output.join('');
}

function simpleObsoleteCalculationStatement(tokens: readonly Token[], startIndex: number): { readonly replacement: string; readonly lastRemovedIndex: number } | undefined {
  const significant = significantTokens(tokens, startIndex, 5);
  const operationToken = significant[0];
  const operation = operationToken?.kind === 'word' ? OPERATIONS[operationToken.text.toUpperCase()] : undefined;
  const firstOperand = significant[1];
  const connector = significant[2];
  const secondOperand = significant[3];
  const period = significant[4];
  if (operationToken === undefined || operation === undefined || firstOperand === undefined || secondOperand === undefined || connector?.kind !== 'word' || period?.text !== '.' || operationToken.line !== period.line) return undefined;
  const operandsMatch = operation.destinationFirst
    ? isPlainIdentifier(firstOperand.text) && isOperand(secondOperand)
    : isOperand(firstOperand) && isPlainIdentifier(secondOperand.text);
  if (!operandsMatch || connector.text.toUpperCase() !== operation.connector) return undefined;

  const destination = operation.destinationFirst ? firstOperand.text : secondOperand.text;
  const value = operation.destinationFirst ? secondOperand.text : firstOperand.text;
  return { replacement: `${destination} ${operation.operator} ${value}`, lastRemovedIndex: secondOperand.index };
}

function isOperand(token: Token | undefined): token is Token {
  return token?.kind === 'literal' || (token?.kind === 'word' && (isPlainIdentifier(token.text) || isNumericLiteral(token.text)));
}

function isPlainIdentifier(text: string | undefined): boolean {
  return text !== undefined && /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
}

function isNumericLiteral(text: string): boolean {
  return /^\d+(?:\.\d+)?$/.test(text);
}

function significantTokens(tokens: readonly Token[], startIndex: number, count: number): readonly (Token & { readonly index: number })[] {
  const result: (Token & { readonly index: number })[] = [];
  for (let index = startIndex; index < tokens.length && result.length < count; index += 1) {
    if (tokens[index]!.kind !== 'whitespace') result.push({ ...tokens[index]!, index });
  }
  return result;
}