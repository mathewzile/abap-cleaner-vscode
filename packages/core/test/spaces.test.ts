import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeCommentSignSpacing, removeSpaceBeforePunctuation } from '../src/index.js';

test('removes same-line spaces before commas and periods', () => {
  const source = '    DATA value TYPE i .\n    CLEAR: value , other .';

  assert.equal(removeSpaceBeforePunctuation(source), '    DATA value TYPE i.\n    CLEAR: value, other.');
});

test('keeps one space before punctuation after ABAP write slash', () => {
  assert.equal(removeSpaceBeforePunctuation("WRITE: / 'text' , / ."), "WRITE: / 'text', / .");
});

test('respects punctuation rule options', () => {
  assert.equal(removeSpaceBeforePunctuation('CLEAR value ,', { executeOnPeriod: false }), 'CLEAR value,');
  assert.equal(removeSpaceBeforePunctuation('CLEAR value .', { executeOnComma: false }), 'CLEAR value.');
});

test('puts spaces around ABAP quotation-mark comments without changing protected comment forms', () => {
  const source = '    value = 1."comment\n    "Full line\n    value = 2."#EC NEEDED\n    value = 3."!help';
  const expected = '    value = 1. " comment\n    " Full line\n    value = 2. "#EC NEEDED\n    value = 3. "!help';

  assert.equal(normalizeCommentSignSpacing(source), expected);
});
