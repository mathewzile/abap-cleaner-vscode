import { tokenize, type Token } from '../../parser/tokenizer.js';

export function removeDirectMethodSelfReferences(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');
  const output: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    if (isDirectMethodSelfReference(tokens, index)) {
      index += 1;
      continue;
    }
    output.push(tokens[index]!.text);
  }
  return output.join('');
}

function isDirectMethodSelfReference(tokens: readonly Token[], index: number): boolean {
  const self = tokens[index];
  const selector = tokens[index + 1];
  const method = tokens[index + 2];
  const opening = tokens[index + 3];
  return self?.kind === 'word'
    && self.text.toUpperCase() === 'ME'
    && selector?.text === '->'
    && method?.kind === 'word'
    && opening?.text === '('
    && areAttached(self, selector)
    && areAttached(selector, method)
    && areAttached(method, opening);
}

function areAttached(left: Token, right: Token): boolean {
  return left.offset + left.text.length === right.offset;
}