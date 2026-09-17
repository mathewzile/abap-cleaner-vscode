import assert from 'node:assert/strict';
import test from 'node:test';
import { moveTerminalLogicalOperators } from '../src/rules/syntax/logical-operator-position.js';

test('moves terminal boolean operators to the start of the next line in simple logical statements', () => {
  assert.equal(
    moveTerminalLogicalOperators('IF iv_active = abap_true AND\n   iv_ready = abap_true.'),
    'IF iv_active = abap_true\n   AND iv_ready = abap_true.',
  );
  assert.equal(
    moveTerminalLogicalOperators('CHECK iv_active = abap_true OR\n      iv_ready = abap_true.'),
    'CHECK iv_active = abap_true\n      OR iv_ready = abap_true.',
  );
  assert.equal(
    moveTerminalLogicalOperators('WHILE iv_active = abap_true EQUIV\r\n      iv_ready = abap_true.'),
    'WHILE iv_active = abap_true\r\n      EQUIV iv_ready = abap_true.',
  );
  assert.equal(
    moveTerminalLogicalOperators('LOOP AT lt_items INTO DATA(ls_item) WHERE\n  active = abap_true.\nENDLOOP.'),
    'LOOP AT lt_items INTO DATA(ls_item)\n  WHERE active = abap_true.\nENDLOOP.',
  );
});

test('leaves comments, literals, and non-logical statements unchanged', () => {
  assert.equal(moveTerminalLogicalOperators('IF iv_active = abap_true AND " continue\n   iv_ready = abap_true.'), 'IF iv_active = abap_true AND " continue\n   iv_ready = abap_true.');
  assert.equal(moveTerminalLogicalOperators("lv_text = `AND\nOR`."), "lv_text = `AND\nOR`.");
  assert.equal(moveTerminalLogicalOperators('DATA lv_operator TYPE string VALUE `AND`.\nWRITE lv_operator OR\n  `unused`.'), 'DATA lv_operator TYPE string VALUE `AND`.\nWRITE lv_operator OR\n  `unused`.');
});