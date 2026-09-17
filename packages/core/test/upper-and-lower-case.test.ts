import assert from 'node:assert/strict';
import test from 'node:test';
import { uppercaseStandaloneStatementKeywords } from '../src/rules/syntax/upper-and-lower-case.js';

test('uppercases recognized standalone statement-leading keywords only', () => {
  assert.equal(uppercaseStandaloneStatementKeywords('if lv_ready = abap_true.\n  write lv_ready.\nendif.'), 'IF lv_ready = abap_true.\n  WRITE lv_ready.\nENDIF.');
  assert.equal(uppercaseStandaloneStatementKeywords('data lv_count TYPE i.'), 'DATA lv_count TYPE i.');
});

test('keeps chained declarations, calls, identifiers, comments, and literals unchanged', () => {
  assert.equal(uppercaseStandaloneStatementKeywords('data: lv_count TYPE i, lv_total TYPE i.'), 'data: lv_count TYPE i, lv_total TYPE i.');
  assert.equal(uppercaseStandaloneStatementKeywords('write( iv_value = value ).'), 'write( iv_value = value ).');
  assert.equal(uppercaseStandaloneStatementKeywords("lv_text = 'if write endif'. \" write value"), "lv_text = 'if write endif'. \" write value");
});