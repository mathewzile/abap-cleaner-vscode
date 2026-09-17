import { tokenize } from '../../parser/tokenizer.js';

const TYPO_CORRECTIONS: Readonly<Record<string, string>> = {
  additinal: 'additional',
  additonal: 'additional',
  allready: 'already',
  allways: 'always',
  alowed: 'allowed',
  aplication: 'application',
  assigment: 'assignment',
  asterics: 'asterisk',
  attachement: 'attachment',
  attibutes: 'attributes',
};

export function correctUnambiguousCommentTypos(sourceText: string): string {
  return tokenize(sourceText, 'ABAP').map((token) => token.kind === 'comment' ? correctComment(token.text) : token.text).join('');
}

function correctComment(text: string): string {
  return text.replace(/[A-Za-z]+/g, (word) => {
    const correction = TYPO_CORRECTIONS[word.toLowerCase()];
    return correction === undefined ? word : matchCase(word, correction);
  });
}

function matchCase(original: string, correction: string): string {
  if (original === original.toUpperCase()) return correction.toUpperCase();
  if (original[0] === original[0]?.toUpperCase()) return correction[0]!.toUpperCase() + correction.slice(1);
  return correction;
}