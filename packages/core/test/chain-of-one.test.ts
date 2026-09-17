import assert from 'node:assert/strict';
import test from 'node:test';

import { simplifyChainOfOne } from '../src/index.js';

test('removes the colon from a simple one-line declaration chain', () => {
  assert.equal(simplifyChainOfOne('DATA: lv_value TYPE i.', { processSimpleChains: true }), 'DATA lv_value TYPE i.');
});

test('preserves chained, multiline, comment, and bracketed statements', () => {
  assert.equal(simplifyChainOfOne('DATA: lv_one TYPE i, lv_two TYPE i.', { processSimpleChains: true }), 'DATA: lv_one TYPE i, lv_two TYPE i.');
  assert.equal(simplifyChainOfOne('DATA:\n  lv_value TYPE i.', { processSimpleChains: true }), 'DATA:\n  lv_value TYPE i.');
  assert.equal(simplifyChainOfOne('DATA: lv_value TYPE i. " comment', { processSimpleChains: true }), 'DATA: lv_value TYPE i. " comment');
  assert.equal(simplifyChainOfOne('CHECK: is_valid( ).', { processSimpleChains: true }), 'CHECK: is_valid( ).');
});