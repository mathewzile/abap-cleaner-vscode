import assert from 'node:assert/strict';
import test from 'node:test';

import { standardizeSimpleAssertEqualsParameterOrder } from '../src/index.js';

test('moves simple expected assertion parameter before actual parameter', () => {
  assert.equal(
    standardizeSimpleAssertEqualsParameterOrder('cl_abap_unit_assert=>assert_equals( act = actual exp = expected ).'),
    'cl_abap_unit_assert=>assert_equals( exp = expected act = actual ).',
  );
});

test('keeps ordered, complex, additional, and commented assertion calls unchanged', () => {
  assert.equal(standardizeSimpleAssertEqualsParameterOrder('cl_abap_unit_assert=>assert_equals( exp = expected act = actual ).'), 'cl_abap_unit_assert=>assert_equals( exp = expected act = actual ).');
  assert.equal(standardizeSimpleAssertEqualsParameterOrder('cl_abap_unit_assert=>assert_equals( act = get_actual( ) exp = expected ).'), 'cl_abap_unit_assert=>assert_equals( act = get_actual( ) exp = expected ).');
  assert.equal(standardizeSimpleAssertEqualsParameterOrder('cl_abap_unit_assert=>assert_equals( act = actual exp = expected msg = text ).'), 'cl_abap_unit_assert=>assert_equals( act = actual exp = expected msg = text ).');
  assert.equal(standardizeSimpleAssertEqualsParameterOrder('cl_abap_unit_assert=>assert_equals( act = actual exp = expected ). " note'), 'cl_abap_unit_assert=>assert_equals( act = actual exp = expected ). " note');
});