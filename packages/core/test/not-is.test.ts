import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeNotIs } from '../src/index.js';

test('changes simple NOT IS predicates to IS NOT', () => {
  assert.equal(normalizeNotIs('IF NOT iv_value IS SUPPLIED.'), 'IF iv_value IS NOT SUPPLIED.');
  assert.equal(normalizeNotIs('IF NOT <ls_data> IS ASSIGNED.'), 'IF <ls_data> IS NOT ASSIGNED.');
});

test('leaves chained and multi-line NOT IS predicates unchanged', () => {
  assert.equal(normalizeNotIs('CHECK NOT iv_value IS : SUPPLIED.'), 'CHECK NOT iv_value IS : SUPPLIED.');
  assert.equal(normalizeNotIs('IF NOT iv_value\n  IS SUPPLIED.'), 'IF NOT iv_value\n  IS SUPPLIED.');
});