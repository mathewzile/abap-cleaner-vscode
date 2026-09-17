import assert from 'node:assert/strict';
import test from 'node:test';

import { replaceSimpleAssertWithClass } from '../src/index.js';

test('converts simple bound and initial assertions with the configured class', () => {
  assert.equal(replaceSimpleAssertWithClass('ASSERT lo_item IS BOUND.', 'cx_product_assert'), 'cx_product_assert=>assert_bound( lo_item ).');
  assert.equal(replaceSimpleAssertWithClass('ASSERT lv_ready IS NOT INITIAL.', 'cx_product_assert'), 'cx_product_assert=>assert_not_initial( lv_ready ).');
  assert.equal(replaceSimpleAssertWithClass('ASSERT NOT lv_ready IS INITIAL.', 'cx_product_assert'), 'cx_product_assert=>assert_not_initial( lv_ready ).');
  assert.equal(replaceSimpleAssertWithClass('ASSERT lv_actual = `expected`.', 'cx_product_assert'), 'cx_product_assert=>assert_equals( act = lv_actual exp = `expected` ).');
  assert.equal(replaceSimpleAssertWithClass('ASSERT lv_ready = abap_true.', 'cx_product_assert'), 'cx_product_assert=>assert_true( lv_ready ).');
  assert.equal(replaceSimpleAssertWithClass('ASSERT lv_ready = abap_false.', 'cx_product_assert'), 'cx_product_assert=>assert_false( lv_ready ).');
  assert.equal(replaceSimpleAssertWithClass('ASSERT sy-subrc = 0.', 'cx_product_assert'), 'cx_product_assert=>assert_subrc().');
  assert.equal(replaceSimpleAssertWithClass('ASSERT sy-subrc = 4.', 'cx_product_assert'), 'cx_product_assert=>assert_subrc( exp = 4 ).');
  assert.equal(replaceSimpleAssertWithClass('ASSERT lv_actual <> lv_expected.', 'cx_product_assert'), 'cx_product_assert=>assert_differs( act = lv_actual exp = lv_expected ).');
});

test('keeps unsupported and commented ASSERT statements unchanged', () => {
  assert.equal(replaceSimpleAssertWithClass('ASSERT value = expected + 1.', 'cx_product_assert'), 'ASSERT value = expected + 1.');
  assert.equal(replaceSimpleAssertWithClass('ASSERT get_value( ) = expected.', 'cx_product_assert'), 'ASSERT get_value( ) = expected.');
  assert.equal(replaceSimpleAssertWithClass('ASSERT get_value( ) <> expected.', 'cx_product_assert'), 'ASSERT get_value( ) <> expected.');
  assert.equal(replaceSimpleAssertWithClass('ASSERT value IS INITIAL. " note', 'cx_product_assert'), 'ASSERT value IS INITIAL. " note');
});