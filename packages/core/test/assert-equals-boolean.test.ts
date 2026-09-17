import assert from 'node:assert/strict';
import test from 'node:test';

import { simplifyAssertEqualsBoolean } from '../src/index.js';

test('simplifies simple one-line boolean assert_equals calls', () => {
  assert.equal(simplifyAssertEqualsBoolean('cl_abap_unit_assert=>assert_equals( act = value exp = abap_true ).'), 'cl_abap_unit_assert=>assert_true( value ).');
  assert.equal(simplifyAssertEqualsBoolean('cl_abap_unit_assert=>assert_equals( exp = abap_false act = flag ).'), 'cl_abap_unit_assert=>assert_false( flag ).');
  assert.equal(simplifyAssertEqualsBoolean('cl_abap_unit_assert=>assert_equals( act = get_value( ) exp = abap_true ).'), 'cl_abap_unit_assert=>assert_true( get_value( ) ).');
});

test('keeps complex, multiline, and non-boolean assert_equals calls', () => {
  assert.equal(simplifyAssertEqualsBoolean('cl_abap_unit_assert=>assert_equals( act = value exp = abap_true msg = text ).'), 'cl_abap_unit_assert=>assert_equals( act = value exp = abap_true msg = text ).');
  assert.equal(simplifyAssertEqualsBoolean('cl_abap_unit_assert=>assert_equals(\n  act = value exp = abap_true ).'), 'cl_abap_unit_assert=>assert_equals(\n  act = value exp = abap_true ).');
});