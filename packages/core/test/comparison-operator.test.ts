import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeComparisonOperators } from '../src/index.js';

test('converts textual operators in logical control statements', () => {
  assert.equal(normalizeComparisonOperators('IF count GT 0 AND count LE maximum.'), 'IF count > 0 AND count <= maximum.');
  assert.equal(normalizeComparisonOperators('IF count EQ 0.'), 'IF count = 0.');
  assert.equal(normalizeComparisonOperators('IF ratio EQ 1.5 AND count GT 0.'), 'IF ratio = 1.5 AND count > 0.');
  assert.equal(normalizeComparisonOperators("CHECK name NE 'unknown'."), "CHECK name <> 'unknown'.");
});

test('does not change contextual non-logical statements', () => {
  assert.equal(normalizeComparisonOperators('DATA operator TYPE string VALUE `GT`.'), 'DATA operator TYPE string VALUE `GT`.');
});