import assert from 'node:assert/strict';
import test from 'node:test';
import { unchainSimpleDeclarations } from '../src/rules/declarations/declaration-chain.js';

test('unchains simple two-item DATA and TYPES declarations', () => {
  assert.equal(
    unchainSimpleDeclarations('  DATA: lv_count TYPE i, lv_text TYPE string.'),
    '  DATA lv_count TYPE i.\n  DATA lv_text TYPE string.',
  );
  assert.equal(
    unchainSimpleDeclarations('TYPES: ty_count TYPE i, ty_text TYPE string.'), 'TYPES ty_count TYPE i.\nTYPES ty_text TYPE string.');
});

test('leaves comments, initial values, and structures chained', () => {
  assert.equal(unchainSimpleDeclarations('DATA: lv_count TYPE i, lv_text TYPE string. " keep'), 'DATA: lv_count TYPE i, lv_text TYPE string. " keep');
  assert.equal(unchainSimpleDeclarations('DATA: lv_count TYPE i VALUE 1, lv_text TYPE string.'), 'DATA: lv_count TYPE i VALUE 1, lv_text TYPE string.');
  assert.equal(unchainSimpleDeclarations('TYPES: BEGIN OF ty_item, id TYPE i, END OF ty_item.'), 'TYPES: BEGIN OF ty_item, id TYPE i, END OF ty_item.');
});