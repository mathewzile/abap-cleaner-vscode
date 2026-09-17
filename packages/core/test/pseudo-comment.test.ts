import assert from 'node:assert/strict';
import test from 'node:test';

import { replaceSimplePseudoComments } from '../src/index.js';

test('converts exact trailing NEEDED and NOTEXT pseudo-comments', () => {
  assert.equal(replaceSimplePseudoComments('DATA value TYPE string. "#EC NEEDED'), 'DATA value TYPE string ##NEEDED.');
  assert.equal(replaceSimplePseudoComments('WRITE text. "#ec notext'), 'WRITE text ##NO_TEXT.');
  assert.equal(replaceSimplePseudoComments('CALL METHOD run. "#EC NO_HANDLER'), 'CALL METHOD run ##NO_HANDLER.');
  assert.equal(replaceSimplePseudoComments('WRITE text. "#EC WARNOK'), 'WRITE text ##WARN_OK.');
});

test('keeps textual, Code Inspector, and standalone pseudo-comments', () => {
  assert.equal(replaceSimplePseudoComments('DATA value TYPE string. "#EC NEEDED required by framework'), 'DATA value TYPE string. "#EC NEEDED required by framework');
  assert.equal(replaceSimplePseudoComments('LOOP AT entries. "#EC CI_SORTSEQ'), 'LOOP AT entries. "#EC CI_SORTSEQ');
  assert.equal(replaceSimplePseudoComments('WRITE text. "#EC LIT_INCOMP'), 'WRITE text. "#EC LIT_INCOMP');
  assert.equal(replaceSimplePseudoComments('"#EC NEEDED'), '"#EC NEEDED');
});