import assert from 'node:assert/strict';
import test from 'node:test';

import { moveLocalConstantsToMethodStart } from '../src/rules/declarations/local-declaration-order.js';

test('moves a single misplaced CONSTANTS declaration to the top of the method', () => {
  const source = [
    'METHOD any_method.',
    '  DATA lv_x TYPE i.',
    '  CONSTANTS lc_max TYPE i VALUE 10.',
    '  lv_x = 1.',
    'ENDMETHOD.',
  ].join('\n');
  const expected = [
    'METHOD any_method.',
    '  CONSTANTS lc_max TYPE i VALUE 10.',
    '  DATA lv_x TYPE i.',
    '  lv_x = 1.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(moveLocalConstantsToMethodStart(source), expected);
});

test('moves several misplaced CONSTANTS declarations to the top, preserving their relative order', () => {
  const source = [
    'METHOD any_method.',
    '  DATA lv_x TYPE i.',
    '  CONSTANTS lc_a TYPE i VALUE 1.',
    '  lv_x = 1.',
    '  CONSTANTS lc_b TYPE i VALUE 2.',
    'ENDMETHOD.',
  ].join('\n');
  const expected = [
    'METHOD any_method.',
    '  CONSTANTS lc_a TYPE i VALUE 1.',
    '  CONSTANTS lc_b TYPE i VALUE 2.',
    '  DATA lv_x TYPE i.',
    '  lv_x = 1.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(moveLocalConstantsToMethodStart(source), expected);
});

test('leaves an already-correctly-positioned CONSTANTS declaration untouched', () => {
  const source = [
    'METHOD any_method.',
    '  CONSTANTS lc_max TYPE i VALUE 10.',
    '  DATA lv_x TYPE i.',
    '  lv_x = 1.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(moveLocalConstantsToMethodStart(source), source);
});

test('does not move a chained CONSTANTS declaration', () => {
  const source = [
    'METHOD any_method.',
    '  DATA lv_x TYPE i.',
    '  CONSTANTS: lc_a TYPE i VALUE 1,',
    '             lc_b TYPE i VALUE 2.',
    '  lv_x = 1.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(moveLocalConstantsToMethodStart(source), source);
});

test('does not move a CONSTANTS declaration that has a leading comment', () => {
  const source = [
    'METHOD any_method.',
    '  DATA lv_x TYPE i.',
    '  " explains lc_max',
    '  CONSTANTS lc_max TYPE i VALUE 10.',
    '  lv_x = 1.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(moveLocalConstantsToMethodStart(source), source);
});

test('refuses the whole method when it contains a BEGIN OF structured declaration', () => {
  const source = [
    'METHOD any_method.',
    '  DATA: BEGIN OF ls_struc,',
    '          comp TYPE i,',
    '        END OF ls_struc.',
    '  CONSTANTS lc_max TYPE i VALUE 10.',
    '  ls_struc-comp = 1.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(moveLocalConstantsToMethodStart(source), source);
});

test('refuses the whole method when it uses a dynamic ASSIGN', () => {
  const source = [
    'METHOD any_method.',
    '  ASSIGN (lv_name) TO FIELD-SYMBOL(<lv_any>).',
    '  CONSTANTS lc_max TYPE i VALUE 10.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(moveLocalConstantsToMethodStart(source), source);
});

test('is idempotent: running twice produces no further change', () => {
  const source = [
    'METHOD any_method.',
    '  DATA lv_x TYPE i.',
    '  CONSTANTS lc_max TYPE i VALUE 10.',
    '  lv_x = 1.',
    'ENDMETHOD.',
  ].join('\n');
  const once = moveLocalConstantsToMethodStart(source);
  const twice = moveLocalConstantsToMethodStart(once);
  assert.equal(twice, once);
});
