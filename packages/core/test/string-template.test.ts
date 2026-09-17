import assert from 'node:assert/strict';
import test from 'node:test';

import { replaceSimpleStringConcatenations } from '../src/index.js';

test('converts a simple text-string and identifier assignment to a string template', () => {
  assert.equal(replaceSimpleStringConcatenations('lv_text = `Hello ` && iv_name.'), 'lv_text = |Hello { iv_name }|.');
  assert.equal(replaceSimpleStringConcatenations('lv_text = iv_name && `!`.'), 'lv_text = |{ iv_name }!|.');
  assert.equal(replaceSimpleStringConcatenations('lv_text = `Hello` && ` world`.'), 'lv_text = |Hello world|.');
});

test('keeps text-field literals, unsafe template content, and non-simple expressions unchanged', () => {
  assert.equal(replaceSimpleStringConcatenations("lv_text = 'Hello ' && iv_name."), "lv_text = 'Hello ' && iv_name.");
  assert.equal(replaceSimpleStringConcatenations('lv_text = `A | B` && iv_name.'), 'lv_text = `A | B` && iv_name.');
  assert.equal(replaceSimpleStringConcatenations('lv_text = `Hello ` && get_name( ).'), 'lv_text = `Hello ` && get_name( ).');
});