import assert from 'node:assert/strict';
import test from 'node:test';

import { removeSimpleLogicalParentheses } from '../src/index.js';

test('removes one outer pair around simple initial predicates', () => {
  assert.equal(removeSimpleLogicalParentheses('IF ( lv_value IS INITIAL ).'), 'IF lv_value IS INITIAL.');
  assert.equal(removeSimpleLogicalParentheses('CHECK ( lv_value IS NOT INITIAL ).'), 'CHECK lv_value IS NOT INITIAL.');
});

test('keeps nested, compound, commented, and unsupported predicates', () => {
  assert.equal(removeSimpleLogicalParentheses('IF ( ( lv_value IS INITIAL ) ).'), 'IF ( ( lv_value IS INITIAL ) ).');
  assert.equal(removeSimpleLogicalParentheses('IF ( lv_one IS INITIAL AND lv_two IS INITIAL ).'), 'IF ( lv_one IS INITIAL AND lv_two IS INITIAL ).');
  assert.equal(removeSimpleLogicalParentheses('IF ( lv_value IS INITIAL ). " comment'), 'IF ( lv_value IS INITIAL ). " comment');
  assert.equal(removeSimpleLogicalParentheses('WHEN ( lv_value IS INITIAL ).'), 'WHEN ( lv_value IS INITIAL ).');
});