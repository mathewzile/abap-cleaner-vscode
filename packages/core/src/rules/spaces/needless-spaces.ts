import { tokenize } from '../../parser/tokenizer.js';

export interface NeedlessSpacesOptions {
  readonly processEmptyBrackets?: boolean;
}

export function normalizeEmptyBracketSpacing(sourceText: string, options: NeedlessSpacesOptions = {}): string {
  if (options.processEmptyBrackets === false) {
    return sourceText;
  }

  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const next = tokens[index + 1];
    const afterNext = tokens[index + 2];
    output.push(token.text);
    if (isEmptyBracketWhitespace(token.text, next?.text, afterNext?.text)) {
      output.push(' ');
      index += 1;
    }
  }
  return output.join('');
}

function isEmptyBracketWhitespace(opening: string, whitespace: string | undefined, closing: string | undefined): boolean {
  return (opening === '(' || opening === '[') && whitespace !== undefined && !whitespace.includes('\n')
    && !whitespace.includes('\r') && whitespace.length > 1 && ((opening === '(' && closing === ')') || (opening === '[' && closing === ']'));
}
