import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeSimpleCalculationAssignments } from '../src/index.js';

test('converts direct one-line calculation assignments', () => {
  assert.equal(normalizeSimpleCalculationAssignments('lv_value = lv_value + 1.'), 'lv_value += 1.');
  assert.equal(normalizeSimpleCalculationAssignments('lv_value = lv_value * factor.'), 'lv_value *= factor.');
});

test('keeps non-identical, compound, and component assignments unchanged', () => {
  assert.equal(normalizeSimpleCalculationAssignments('lv_value = iv_value + 1.'), 'lv_value = iv_value + 1.');
  assert.equal(normalizeSimpleCalculationAssignments('lv_value = lv_value * factor + 1.'), 'lv_value = lv_value * factor + 1.');
  assert.equal(normalizeSimpleCalculationAssignments('structure-component = structure-component + 1.'), 'structure-component = structure-component + 1.');
});