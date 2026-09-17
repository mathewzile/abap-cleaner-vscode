import { findMatchingBracket, tokenize, type Token } from '../../parser/tokenizer.js';

export function removeSimpleCallMethod(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const match = simpleCallMethod(tokens, index);
    if (match !== undefined) {
      if (match.replacement !== undefined) output.push(match.replacement);
      index = match.lastRemovedIndex;
      continue;
    }
    output.push(tokens[index]!.text);
  }
  return output.join('');
}

function simpleCallMethod(tokens: readonly Token[], callIndex: number): { readonly lastRemovedIndex: number; readonly replacement?: string } | undefined {
  const call = tokens[callIndex];
  if (call?.kind !== 'word' || call.text.toUpperCase() !== 'CALL') return undefined;
  const methodIndex = nextNonWhitespaceIndex(tokens, callIndex + 1);
  if (methodIndex === undefined) return undefined;
  const method = tokens[methodIndex]!;
  if (method.kind !== 'word' || method.text.toUpperCase() !== 'METHOD') return undefined;
  const targetIndex = nextNonWhitespaceIndex(tokens, methodIndex + 1);
  if (targetIndex === undefined) return undefined;
  const target = tokens[targetIndex]!;
  if (target.kind !== 'word' || target.line !== call.line) return undefined;
  const openingIndex = openingParenthesisIndex(tokens, targetIndex, call.line);
  if (openingIndex !== undefined && tokens[openingIndex]?.text === '(' && tokens[openingIndex]!.line === call.line) {
    const closingIndex = findMatchingBracket(tokens, openingIndex);
    if (closingIndex !== undefined && tokens[closingIndex]!.line === call.line) {
      return { lastRemovedIndex: targetIndex - 1 };
    }
  }
  const targetEndIndex = staticTargetEndIndex(tokens, targetIndex, call.line);
  if (targetEndIndex === undefined) return undefined;
  const staticTargetEnd = targetEndIndex;
  const nextIndex = nextNonWhitespaceIndex(tokens, staticTargetEnd + 1);
    if (nextIndex === undefined) return undefined;
    const next = tokens[nextIndex]!;
    if (next.text === '.' && next.line === call.line) {
      return {
        lastRemovedIndex: staticTargetEnd,
        replacement: tokens.slice(targetIndex, staticTargetEnd + 1).map((token) => token.text).join('') + '()',
      };
    }
    const exporting = simpleExportingArgument(tokens, nextIndex, call.line);
    if (exporting === undefined) return undefined;
  return {
      lastRemovedIndex: exporting.valueIndex,
      replacement: tokens.slice(targetIndex, staticTargetEnd + 1).map((token) => token.text).join('') + `( ${exporting.parameter} = ${exporting.value} )`,
  };
}

  function simpleExportingArgument(tokens: readonly Token[], exportingIndex: number, line: number): { readonly parameter: string; readonly value: string; readonly valueIndex: number } | undefined {
    const exporting = tokens[exportingIndex];
    const parameterIndex = nextNonWhitespaceIndex(tokens, exportingIndex + 1);
    const assignmentIndex = parameterIndex === undefined ? undefined : nextNonWhitespaceIndex(tokens, parameterIndex + 1);
    const valueIndex = assignmentIndex === undefined ? undefined : nextNonWhitespaceIndex(tokens, assignmentIndex + 1);
    const periodIndex = valueIndex === undefined ? undefined : nextNonWhitespaceIndex(tokens, valueIndex + 1);
    if (exporting?.kind !== 'word' || exporting.text.toUpperCase() !== 'EXPORTING' || parameterIndex === undefined || assignmentIndex === undefined || valueIndex === undefined || periodIndex === undefined) return undefined;
    const parameter = tokens[parameterIndex]!;
    const assignment = tokens[assignmentIndex]!;
    const value = tokens[valueIndex]!;
    const period = tokens[periodIndex]!;
    if (!isPlainIdentifier(parameter.text) || assignment.text !== '=' || !isSimpleValue(value) || period.text !== '.' || period.line !== line) return undefined;
    return { parameter: parameter.text, value: value.text, valueIndex };
  }

  function isPlainIdentifier(text: string): boolean {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
  }

  function isSimpleValue(token: Token): boolean {
    return token.kind === 'literal' || (token.kind === 'word' && isPlainIdentifier(token.text));
  }

function openingParenthesisIndex(tokens: readonly Token[], targetIndex: number, line: number): number | undefined {
  const nextIndex = nextNonWhitespaceIndex(tokens, targetIndex + 1);
  if (nextIndex === undefined) return undefined;
  if (tokens[nextIndex]?.text === '(') return nextIndex;
  if ((tokens[nextIndex]?.text !== '->' && tokens[nextIndex]?.text !== '=>') || tokens[nextIndex]!.line !== line) return undefined;
  const methodNameIndex = nextNonWhitespaceIndex(tokens, nextIndex + 1);
  if (methodNameIndex === undefined || tokens[methodNameIndex]?.kind !== 'word' || tokens[methodNameIndex]!.line !== line) return undefined;
  return nextNonWhitespaceIndex(tokens, methodNameIndex + 1);
}

function staticTargetEndIndex(tokens: readonly Token[], targetIndex: number, line: number): number | undefined {
  const selectorIndex = nextNonWhitespaceIndex(tokens, targetIndex + 1);
  if (selectorIndex === undefined || (tokens[selectorIndex]?.text !== '->' && tokens[selectorIndex]?.text !== '=>')) return targetIndex;
  const methodNameIndex = nextNonWhitespaceIndex(tokens, selectorIndex + 1);
  if (methodNameIndex === undefined) return undefined;
  const methodName = tokens[methodNameIndex]!;
  return methodName.kind === 'word' && methodName.line === line ? methodNameIndex : undefined;
}

function nextNonWhitespaceIndex(tokens: readonly Token[], index: number): number | undefined {
  let cursor = index;
  while (cursor < tokens.length && tokens[cursor]!.kind === 'whitespace') cursor += 1;
  return cursor < tokens.length ? cursor : undefined;
}