import assert from 'node:assert/strict';
import test from 'node:test';

import { splitSimpleEqualsSignChains } from '../src/index.js';

test('splits simple equals-sign chains right to left', () => {
  assert.equal(splitSimpleEqualsSignChains('first = second = value.'), 'second = value.\nfirst = second.');
  assert.equal(splitSimpleEqualsSignChains('  first = second = third = 42.'), '  third = 42.\n  second = third.\n  first = second.');
  assert.equal(splitSimpleEqualsSignChains("date = number = '20260917'."), "number = '20260917'.\ndate = number.");
});

test('keeps comments, expressions, selectors, and multiline chains', () => {
  assert.equal(splitSimpleEqualsSignChains('first = second = get_value( ).'), 'first = second = get_value( ).');
  assert.equal(splitSimpleEqualsSignChains('first = second = structure-component.'), 'first = second = structure-component.');
  assert.equal(splitSimpleEqualsSignChains('first = second = value. " explanation'), 'first = second = value. " explanation');
  assert.equal(splitSimpleEqualsSignChains('first =\n  second = value.'), 'first =\n  second = value.');
});