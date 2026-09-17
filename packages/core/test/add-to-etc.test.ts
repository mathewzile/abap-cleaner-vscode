import assert from 'node:assert/strict';
import test from 'node:test';

import { replaceSimpleAddToEtc } from '../src/index.js';

test('converts direct one-line obsolete calculation statements', () => {
  assert.equal(replaceSimpleAddToEtc('ADD 1 TO lv_total.'), 'lv_total += 1.');
  assert.equal(replaceSimpleAddToEtc('SUBTRACT amount FROM lv_total.'), 'lv_total -= amount.');
  assert.equal(replaceSimpleAddToEtc('MULTIPLY lv_total BY 2.'), 'lv_total *= 2.');
  assert.equal(replaceSimpleAddToEtc('DIVIDE lv_total BY divisor.'), 'lv_total /= divisor.');
});

test('keeps expressions, selectors, chains, comments, and multiline statements unchanged', () => {
  assert.equal(replaceSimpleAddToEtc('ADD value + 1 TO lv_total.'), 'ADD value + 1 TO lv_total.');
  assert.equal(replaceSimpleAddToEtc('ADD value TO structure-component.'), 'ADD value TO structure-component.');
  assert.equal(replaceSimpleAddToEtc('ADD 1 TO: lv_first, lv_second.'), 'ADD 1 TO: lv_first, lv_second.');
  assert.equal(replaceSimpleAddToEtc('ADD " comment\n 1 TO lv_total.'), 'ADD " comment\n 1 TO lv_total.');
});