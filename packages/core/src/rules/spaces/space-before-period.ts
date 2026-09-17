import { tokenize, type Token } from '../../parser/tokenizer.js';

export interface SpaceBeforePeriodOptions {
  readonly executeOnComma?: boolean;
  readonly executeOnPeriod?: boolean;
}

export function removeSpaceBeforePunctuation(sourceText: string, options: SpaceBeforePeriodOptions = {}): string {
  const executeOnComma = options.executeOnComma ?? true;
  const executeOnPeriod = options.executeOnPeriod ?? true;
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const previous = tokens[index - 1];
    const beforePrevious = tokens[index - 2];
    if (isTargetPunctuation(token, executeOnComma, executeOnPeriod) && isSameLineWhitespace(previous)) {
      output[output.length - 1] = beforePrevious?.text === '/' ? ' ' : '';
    }
    output.push(token.text);
  }

  return output.join('');
}

function isTargetPunctuation(token: Token, executeOnComma: boolean, executeOnPeriod: boolean): boolean {
  return (executeOnComma && token.text === ',') || (executeOnPeriod && token.text === '.');
}

function isSameLineWhitespace(token: Token | undefined): token is Token {
  return token?.kind === 'whitespace' && !token.text.includes('\n') && !token.text.includes('\r');
}
