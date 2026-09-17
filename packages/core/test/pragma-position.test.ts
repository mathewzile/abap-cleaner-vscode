import assert from 'node:assert/strict';
import test from 'node:test';

import { moveTrailingPragmasBeforePeriod } from '../src/index.js';

test('moves a sole trailing pragma before a statement period', () => {
  assert.equal(moveTrailingPragmasBeforePeriod('DATA value TYPE string. ##NEEDED\n'), 'DATA value TYPE string ##NEEDED.\n');
});

test('keeps non-terminal, leading, and commented trailing pragma forms unchanged', () => {
  assert.equal(moveTrailingPragmasBeforePeriod('DATA value TYPE string. ##NEEDED " note'), 'DATA value TYPE string. ##NEEDED " note');
  assert.equal(moveTrailingPragmasBeforePeriod('##NEEDED DATA value TYPE string.'), '##NEEDED DATA value TYPE string.');
  assert.equal(moveTrailingPragmasBeforePeriod('DATA value ##NEEDED TYPE string.'), 'DATA value ##NEEDED TYPE string.');
});