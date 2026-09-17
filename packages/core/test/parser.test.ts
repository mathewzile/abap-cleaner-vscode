import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { findBracketPairs, findMatchingBracket, previewLanguage, tokenize } from '../src/index.js';

test('previewLanguage classifies the supported language headers', () => {
  assert.equal(previewLanguage('CLASS zcl_example DEFINITION.'), 'ABAP');
  assert.equal(previewLanguage('// header\ndefine view entity zi_example as select from mara {}'), 'DDL');
  assert.equal(previewLanguage('define role zi_example { grant select on zi_view; }'), 'DCL');
  assert.equal(previewLanguage('// header\nmanaged implementation in class zbp_example unique;'), 'NOT_SUPPORTED');
});

test('tokenize round-trips ABAP including literals and comments', () => {
  const source = "METHOD any_method.\n  DATA text TYPE string VALUE 'Don''t'. \" note\nENDMETHOD.";
  const tokens = tokenize(source, 'ABAP');

  assert.equal(tokens.map((token) => token.text).join(''), source);
  assert.deepEqual(tokens.filter((token) => token.kind === 'literal').map((token) => token.text), ["'Don''t'"]);
  assert.deepEqual(tokens.filter((token) => token.kind === 'comment').map((token) => token.text), ['" note']);
});

test('tokenize round-trips DDL comments, literals, and punctuation', () => {
  const source = "@EndUserText.label: 'Example'\ndefine view entity zi_example as select from mara { key matnr } // key";
  const tokens = tokenize(source, 'DDL');

  assert.equal(tokens.map((token) => token.text).join(''), source);
  assert.deepEqual(tokens.filter((token) => token.kind === 'comment').map((token) => token.text), ['// key']);
});

test('tokenize preserves tabs inside protected and regular text', () => {
  const tokens = tokenize("DATA\tvalue TYPE string VALUE 'a\tb'. \"c\td", 'ABAP');

  assert.equal(tokens.map((token) => token.text).join(''), "DATA\tvalue TYPE string VALUE 'a\tb'. \"c\td");
});

test('tokenize and pair nested ABAP expression brackets', () => {
  const tokens = tokenize('value = table[ key = method( argument ) ].', 'ABAP');
  assert.equal(tokens.map((token) => token.text).join(''), 'value = table[ key = method( argument ) ].');
  assert.deepEqual(findBracketPairs(tokens), [
    { openingIndex: 12, closingIndex: 16 },
    { openingIndex: 5, closingIndex: 18 },
  ]);
  assert.equal(findMatchingBracket(tokens, 5), 18);
  assert.equal(findMatchingBracket(tokens, 12), 16);
});

test('bracket pairing ignores protected text and leaves unmatched brackets unpaired', () => {
  const tokens = tokenize("value = '( ignored )' \" [ ignored ]\nresult = call( value = table[ key = 1 ).", 'ABAP');
  assert.deepEqual(findBracketPairs(tokens), []);
  assert.equal(findMatchingBracket(tokens, 12), undefined);
});

test('tokenize separates instance selectors without splitting component identifiers', () => {
  const tokens = tokenize('lo_ref->run( structure-component = value ).', 'ABAP');
  assert.deepEqual(tokens.filter((token) => token.kind !== 'whitespace').map((token) => token.text), [
    'lo_ref', '->', 'run', '(', 'structure-component', '=', 'value', ')', '.',
  ]);
});

test('tokenize separates whitespace-delimited arithmetic operators without splitting component identifiers', () => {
  const tokens = tokenize('lv_value = lv_value + 1. structure-component = value.', 'ABAP');
  assert.deepEqual(tokens.filter((token) => token.kind !== 'whitespace').map((token) => token.text), [
    'lv_value', '=', 'lv_value', '+', '1', '.', 'structure-component', '=', 'value', '.',
  ]);
});

for (const fileName of ['cleanup-sample.abap', 'cleanup-sample.acds'] as const) {
  test(`tokenize round-trips ${fileName}`, async () => {
    const source = await readFile(resolve(__dirname, '../../../../reference-eclipse-plugin/vscode-extension/samples', fileName), 'utf8');
    const tokens = tokenize(source, previewLanguage(source));

    assert.equal(tokens.map((token) => token.text).join(''), source);
  });
}
