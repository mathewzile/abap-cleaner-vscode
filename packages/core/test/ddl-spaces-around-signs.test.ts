import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDdlSpacesAroundSigns } from '../src/rules/ddl/spaces-around-signs.js';

test('removes space before a comma and normalizes to exactly one space after', () => {
  assert.equal(normalizeDdlSpacesAroundSigns('key AnyField  ,    OtherField'), 'key AnyField, OtherField');
  assert.equal(normalizeDdlSpacesAroundSigns('key AnyField,OtherField'), 'key AnyField, OtherField');
});

test('leaves a comma untouched at line end or before a closing bracket', () => {
  const atLineEnd = 'key AnyField,\n  OtherField';
  assert.equal(normalizeDdlSpacesAroundSigns(atLineEnd), atLineEnd);

  const beforeBracket = 'concat(AnyText ,)';
  assert.equal(normalizeDdlSpacesAroundSigns(beforeBracket), 'concat(AnyText,)');
});

test('adds a space before and after an attached line-end comment marker', () => {
  assert.equal(normalizeDdlSpacesAroundSigns('key AnyField//any comment'), 'key AnyField // any comment');
  assert.equal(normalizeDdlSpacesAroundSigns('key AnyField--any comment'), 'key AnyField -- any comment');
});

test('keeps a marker-only separator comment untouched and leaves already-correct spacing as-is', () => {
  const separator = '// ------------------------\nkey AnyField';
  assert.equal(normalizeDdlSpacesAroundSigns(separator), separator);

  const alreadyCorrect = 'key AnyField, OtherField // a comment';
  assert.equal(normalizeDdlSpacesAroundSigns(alreadyCorrect), alreadyCorrect);
});
