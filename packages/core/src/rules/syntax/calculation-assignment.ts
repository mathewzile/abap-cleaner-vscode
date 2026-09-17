import { tokenize, type Token } from '../../parser/tokenizer.js';

const CALCULATION_OPERATORS = new Set(['+', '-', '*', '/']);

export function normalizeSimpleCalculationAssignments(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const match = simpleCalculationAssignment(tokens, index);
    if (match === undefined) {
      output.push(tokens[index]!.text);
      continue;
    }
    output.push(match.replacement);
    index = match.lastRemovedIndex;
  }
  return output.join('');
}

function simpleCalculationAssignment(tokens: readonly Token[], startIndex: number): { readonly replacement: string; readonly lastRemovedIndex: number } | undefined {
  const significant = significantTokens(tokens, startIndex, 6);
  if (significant.length !== 6) return undefined;
  const left = significant[0]!;
  const assignment = significant[1]!;
  const repeatedLeft = significant[2]!;
  const operator = significant[3]!;
  const right = significant[4]!;
  const period = significant[5]!;
  if (left.kind !== 'word' || !isPlainIdentifier(left.text) || assignment.text !== '=' || repeatedLeft.kind !== 'word' || repeatedLeft.text !== left.text || !CALCULATION_OPERATORS.has(operator.text) || (right.kind !== 'word' && right.kind !== 'literal') || period.text !== '.') return undefined;
  if (left.line !== period.line) return undefined;
  const assignmentWhitespace = tokens.slice(startIndex + 1, significant[1]!.index).map((token) => token.text).join('');
  return { replacement: left.text + assignmentWhitespace + operator.text + '=', lastRemovedIndex: operator.index };
}

function isPlainIdentifier(text: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
}

function significantTokens(tokens: readonly Token[], startIndex: number, count: number): readonly (Token & { readonly index: number })[] {
  const result: (Token & { readonly index: number })[] = [];
  for (let index = startIndex; index < tokens.length && result.length < count; index += 1) {
    if (tokens[index]!.kind !== 'whitespace') result.push({ ...tokens[index]!, index });
  }
  return result;
}