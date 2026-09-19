import assert from 'node:assert/strict';
import test from 'node:test';

import { alignClearFreeChains } from '../src/rules/syntax/align-clear-free.js';

test('breaks a CLEAR: chain onto its own lines, indented to the column of the first item', () => {
  assert.equal(
    alignClearFreeChains('CLEAR: a, b, c.'),
    'CLEAR: a,\n       b,\n       c.',
  );
});

test('breaks a FREE: chain the same way', () => {
  assert.equal(
    alignClearFreeChains('FREE: a, b.'),
    'FREE: a,\n      b.',
  );
});

test('leaves a non-chained CLEAR statement untouched', () => {
  const source = 'CLEAR a.';
  assert.equal(alignClearFreeChains(source), source);
});

test('refuses a chain item with an addition (e.g. WITH ... MODE) rather than misread it', () => {
  const source = 'CLEAR: a, b WITH NULL, c.';
  assert.equal(alignClearFreeChains(source), source);
});

test('leaves an unrelated chained statement (not CLEAR/FREE) untouched', () => {
  const source = 'DATA: a TYPE i, b TYPE i.';
  assert.equal(alignClearFreeChains(source), source);
});

test('is idempotent: running twice on already-broken chain makes no further change', () => {
  const source = 'CLEAR: a, b, c.';
  const once = alignClearFreeChains(source);
  const twice = alignClearFreeChains(once);
  assert.equal(twice, once);
});
