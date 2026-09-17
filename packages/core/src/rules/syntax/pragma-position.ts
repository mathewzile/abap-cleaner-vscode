import { tokenize } from '../../parser/tokenizer.js';

export function moveTrailingPragmasBeforePeriod(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const replacements: { readonly start: number; readonly end: number; readonly text: string }[] = [];
  for (let index = 0; index + 2 < tokens.length; index += 1) {
    const period = tokens[index]!;
    const spacing = tokens[index + 1]!;
    const pragma = tokens[index + 2]!;
    if (period.text !== '.' || spacing.kind !== 'whitespace' || spacing.text.includes('\n') || !isPragma(pragma.text) || !endsLineAfterPragma(tokens, index + 2)) continue;
    replacements.push({ start: period.offset, end: pragma.offset + pragma.text.length, text: ` ${pragma.text}.` });
  }
  return replacements.reduceRight((text, replacement) => text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end), sourceText);
}

function isPragma(text: string): boolean {
  return /^##[A-Za-z][A-Za-z0-9_]*(?:\[[^\]\r\n]*\])?$/.test(text);
}

function endsLineAfterPragma(tokens: readonly { readonly kind: string; readonly text: string }[], pragmaIndex: number): boolean {
  const next = tokens[pragmaIndex + 1];
  return next === undefined || next.kind === 'comment' || (next.kind === 'whitespace' && /\r|\n/.test(next.text));
}