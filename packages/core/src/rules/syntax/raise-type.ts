import { tokenize, type Token } from '../../parser/tokenizer.js';

export function simplifyRaiseType(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const match = simpleRaiseType(tokens, index);
    if (match === undefined) {
      output.push(tokens[index]!.text);
      continue;
    }
    output.push(match.replacement);
    index = match.lastRemovedIndex;
  }
  return output.join('');
}

function simpleRaiseType(tokens: readonly Token[], startIndex: number): { readonly replacement: string; readonly lastRemovedIndex: number } | undefined {
  const significant = significantTokens(tokens, startIndex, 6);
  const raise = significant[0];
  const second = significant[1];
  if (raise?.kind === 'word' && raise.text.toUpperCase() === 'RAISE' && second?.kind === 'word' && second.text.toUpperCase() === 'SHORTDUMP') {
    const type = significant[2];
    const exceptionClass = significant[3];
    const period = significant[4];
    if (type?.kind === 'word' && type.text.toUpperCase() === 'TYPE' && exceptionClass?.kind === 'word' && isPlainIdentifier(exceptionClass.text) && period?.text === '.' && raise.line === period.line) {
      return { replacement: `RAISE SHORTDUMP NEW ${exceptionClass.text}( )`, lastRemovedIndex: exceptionClass.index };
    }
    if (type?.kind === 'word' && type.text.toUpperCase() === 'TYPE' && exceptionClass?.kind === 'word' && isPlainIdentifier(exceptionClass.text)) {
      return simpleRaiseTypeExporting(tokens, exceptionClass, 'RAISE SHORTDUMP', raise.line);
    }
  }
  const exception = significant[second?.text.toUpperCase() === 'RESUMABLE' ? 2 : 1];
  const type = significant[second?.text.toUpperCase() === 'RESUMABLE' ? 3 : 2];
  const exceptionClass = significant[second?.text.toUpperCase() === 'RESUMABLE' ? 4 : 3];
  const period = significant[second?.text.toUpperCase() === 'RESUMABLE' ? 5 : 4];
  if (raise?.kind !== 'word' || raise.text.toUpperCase() !== 'RAISE' || exception?.kind !== 'word' || exception.text.toUpperCase() !== 'EXCEPTION' || type?.kind !== 'word' || type.text.toUpperCase() !== 'TYPE' || exceptionClass?.kind !== 'word' || !isPlainIdentifier(exceptionClass.text) || raise.line !== exceptionClass.line) return undefined;
  const resumable = second?.kind === 'word' && second.text.toUpperCase() === 'RESUMABLE';
  if (period?.text === '.' && period.line === raise.line) {
    return { replacement: `RAISE ${resumable ? 'RESUMABLE ' : ''}EXCEPTION NEW ${exceptionClass.text}( )`, lastRemovedIndex: exceptionClass.index };
  }
  return simpleRaiseTypeExporting(tokens, exceptionClass, `RAISE ${resumable ? 'RESUMABLE ' : ''}EXCEPTION`, raise.line);
}

function simpleRaiseTypeExporting(tokens: readonly Token[], exceptionClass: Token & { readonly index: number }, prefix: string, line: number): { readonly replacement: string; readonly lastRemovedIndex: number } | undefined {
  const significant = significantTokens(tokens, exceptionClass.index + 1, tokens.length);
  if (significant[0]?.kind !== 'word' || significant[0].text.toUpperCase() !== 'EXPORTING') return undefined;
  const assignments: string[] = [];
  let index = 1;
  while (index + 2 < significant.length && significant[index]?.text !== '.') {
    const parameter = significant[index];
    const assignment = significant[index + 1];
    const value = significant[index + 2];
    if (parameter === undefined || value === undefined || !isPlainIdentifier(parameter.text) || assignment?.text !== '=' || !isSimpleValue(value)) return undefined;
    assignments.push(`${parameter.text} = ${value.text}`);
    index += 3;
  }
  const period = significant[index];
  if (assignments.length === 0 || period?.text !== '.' || period.line !== line || index !== significant.length - 1) return undefined;
  return { replacement: `${prefix} NEW ${exceptionClass.text}( ${assignments.join(' ')} )`, lastRemovedIndex: significant[index - 1]!.index };
}

function isPlainIdentifier(text: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
}

function isSimpleValue(token: Token | undefined): token is Token {
  return token?.kind === 'literal' || (token?.kind === 'word' && isPlainIdentifier(token.text));
}

function significantTokens(tokens: readonly Token[], startIndex: number, count: number): readonly (Token & { readonly index: number })[] {
  const result: (Token & { readonly index: number })[] = [];
  for (let index = startIndex; index < tokens.length && result.length < count; index += 1) {
    if (tokens[index]!.kind !== 'whitespace') result.push({ ...tokens[index]!, index });
  }
  return result;
}