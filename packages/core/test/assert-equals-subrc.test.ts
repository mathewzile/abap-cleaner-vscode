import assert from 'node:assert/strict';
import test from 'node:test';

import { simplifyAssertEqualsSubrc } from '../src/index.js';

test('simplifies simple one-line default subrc assertions', () => {
  assert.equal(simplifyAssertEqualsSubrc('cl_abap_unit_assert=>assert_equals( act = sy-subrc exp = 0 ).'), 'cl_abap_unit_assert=>assert_subrc( ).');
  assert.equal(simplifyAssertEqualsSubrc('cl_abap_unit_assert=>assert_equals( exp = 0 act = sy-subrc ).'), 'cl_abap_unit_assert=>assert_subrc( ).');
  assert.equal(simplifyAssertEqualsSubrc('cl_abap_unit_assert=>assert_equals( act = sy-subrc exp = 4 ).'), 'cl_abap_unit_assert=>assert_subrc( exp = 4 ).');
});

test('keeps non-default, complex, and multiline subrc assertions', () => {
  assert.equal(simplifyAssertEqualsSubrc('cl_abap_unit_assert=>assert_equals( act = sy-subrc exp = expected_subrc ).'), 'cl_abap_unit_assert=>assert_equals( act = sy-subrc exp = expected_subrc ).');
  assert.equal(simplifyAssertEqualsSubrc('cl_abap_unit_assert=>assert_equals( act = sy-subrc exp = 0 msg = text ).'), 'cl_abap_unit_assert=>assert_equals( act = sy-subrc exp = 0 msg = text ).');
  assert.equal(simplifyAssertEqualsSubrc('cl_abap_unit_assert=>assert_equals(\n  act = sy-subrc exp = 0 ).'), 'cl_abap_unit_assert=>assert_equals(\n  act = sy-subrc exp = 0 ).');
});