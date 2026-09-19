import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDdlSpacesAroundBrackets } from '../src/rules/ddl/spaces-around-brackets.js';

test('adds spaces around an association cardinality bracket and removes spaces just inside it', () => {
  assert.equal(normalizeDdlSpacesAroundBrackets('association[1..* ]to I_Other'), 'association [1..*] to I_Other');
  assert.equal(normalizeDdlSpacesAroundBrackets('composition [ *]to I_Other'), 'composition [*] to I_Other');
});

test('removes space before a path-expression bracket and leaves spacing after it untouched', () => {
  assert.equal(normalizeDdlSpacesAroundBrackets('_OtherAlias [1:AnyValue > 0]._AnyAssoc'), '_OtherAlias[1:AnyValue > 0]._AnyAssoc');
  assert.equal(normalizeDdlSpacesAroundBrackets('_ThirdAlias[ inner where i = 2 ]._Text'), '_ThirdAlias[inner where i = 2]._Text');
});

test('leaves already-correctly-spaced brackets untouched', () => {
  const association = 'association [0..*] to I_Other as _Other';
  assert.equal(normalizeDdlSpacesAroundBrackets(association), association);

  const pathExpression = '_Alias[1:AnyValue > 0].AnyField as AnyField';
  assert.equal(normalizeDdlSpacesAroundBrackets(pathExpression), pathExpression);
});
