import { tokenize, type Token } from '../../parser/tokenizer.js';

export interface SpaceAroundCommentSignOptions {
  readonly spaceBeforeCommentSign?: boolean;
  readonly spaceAfterCommentSign?: boolean;
}

export function normalizeCommentSignSpacing(sourceText: string, options: SpaceAroundCommentSignOptions = {}): string {
  const spaceBefore = options.spaceBeforeCommentSign ?? true;
  const spaceAfter = options.spaceAfterCommentSign ?? true;
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.kind === 'comment' && token.text.startsWith('"')) {
      const previous = tokens[index - 1];
      if (spaceBefore && previous?.kind !== 'whitespace' && hasCodeEarlierOnLine(tokens, index)) {
        output.push(' ');
      }
      output.push(spaceAfter ? addSpaceAfterCommentSign(token.text) : token.text);
    } else {
      output.push(token.text);
    }
  }

  return output.join('');
}

function addSpaceAfterCommentSign(text: string): string {
  return /^["][A-Za-z0-9]/.test(text) ? `" ${text.slice(1)}` : text;
}

function hasCodeEarlierOnLine(tokens: readonly Token[], tokenIndex: number): boolean {
  for (let index = tokenIndex - 1; index >= 0; index -= 1) {
    const token = tokens[index]!;
    if (token.kind === 'whitespace' && (token.text.includes('\n') || token.text.includes('\r'))) {
      return false;
    }
    if (token.kind !== 'whitespace') {
      return true;
    }
  }
  return false;
}
