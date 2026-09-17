import { tokenize, type Token } from '../../parser/tokenizer.js';

export function simplifyCreateObject(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const match = simpleCreateObject(tokens, index) ?? simpleCreateObjectExporting(tokens, index);
    if (match === undefined) {
      output.push(tokens[index]!.text);
      continue;
    }
    output.push(match.replacement);
    index = match.lastRemovedIndex;
  }
  return output.join('');
}

function simpleCreateObject(tokens: readonly Token[], startIndex: number): { readonly replacement: string; readonly lastRemovedIndex: number } | undefined {
  const significant = significantTokens(tokens, startIndex, 5);
  const create = significant[0];
  const object = significant[1];
  const target = significant[2];
  const next = significant[3];
  if (create?.kind !== 'word' || create.text.toUpperCase() !== 'CREATE' || object?.kind !== 'word' || object.text.toUpperCase() !== 'OBJECT' || target?.kind !== 'word' || !isPlainIdentifier(target.text) || next === undefined) return undefined;
  if (next.text === '.' && create.line === next.line) {
    return { replacement: `${target.text} = NEW #( )`, lastRemovedIndex: target.index };
  }
  const type = next;
  const className = significant[4];
  const period = significant[5];
  if (type.kind !== 'word' || type.text.toUpperCase() !== 'TYPE' || className?.kind !== 'word' || !isPlainIdentifier(className.text) || period?.text !== '.' || create.line !== period.line) return undefined;
  return { replacement: `${target.text} = NEW ${className.text}( )`, lastRemovedIndex: className.index };
}

function simpleCreateObjectExporting(tokens: readonly Token[], startIndex: number): { readonly replacement: string; readonly lastRemovedIndex: number } | undefined {
  const significant = significantTokens(tokens, startIndex, tokens.length);
  const [create, object, target, typeOrExporting] = significant;
  if (create?.kind !== 'word' || create.text.toUpperCase() !== 'CREATE' || object?.kind !== 'word' || object.text.toUpperCase() !== 'OBJECT' || target?.kind !== 'word' || !isPlainIdentifier(target.text)) return undefined;
  let index = 3;
  let constructorType = '#';
  if (typeOrExporting?.kind === 'word' && typeOrExporting.text.toUpperCase() === 'TYPE') {
    const className = significant[index + 1];
    if (className?.kind !== 'word' || !isPlainIdentifier(className.text)) return undefined;
    constructorType = className.text;
    index += 2;
  }
  if (significant[index]?.kind !== 'word' || significant[index]!.text.toUpperCase() !== 'EXPORTING') return undefined;
  index += 1;
  const assignments: string[] = [];
  while (index + 2 < significant.length && significant[index]?.text !== '.') {
    const parameter = significant[index];
    const assignment = significant[index + 1];
    const value = significant[index + 2];
    if (parameter === undefined || value === undefined || !isPlainIdentifier(parameter.text) || assignment?.text !== '=' || !isSimpleValue(value) || value.text.toUpperCase() === target.text.toUpperCase()) return undefined;
    assignments.push(`${parameter.text} = ${value.text}`);
    index += 3;
  }
  const period = significant[index];
  if (assignments.length === 0 || period?.text !== '.' || period.line !== create.line || index !== significant.length - 1) return undefined;
  return { replacement: `${target.text} = NEW ${constructorType}( ${assignments.join(' ')} )`, lastRemovedIndex: significant[index - 1]!.index };
}

function isPlainIdentifier(text: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
}

function isSimpleValue(token: Token): boolean {
  return token.kind === 'literal' || (token.kind === 'word' && isPlainIdentifier(token.text));
}

function significantTokens(tokens: readonly Token[], startIndex: number, count: number): readonly (Token & { readonly index: number })[] {
  const result: (Token & { readonly index: number })[] = [];
  for (let index = startIndex; index < tokens.length && result.length < count + 1; index += 1) {
    if (tokens[index]!.kind !== 'whitespace') result.push({ ...tokens[index]!, index });
  }
  return result;
}