import assert from 'node:assert/strict';
import test from 'node:test';

import { removeInitialScalarClears } from '../src/index.js';

test('removes an immediately following CLEAR for a declared scalar variable', () => {
  assert.equal(removeInitialScalarClears('DATA lv_count TYPE i.\nCLEAR lv_count.\nwork( ).'), 'DATA lv_count TYPE i.\n\nwork( ).');
});

test('keeps nonadjacent, initialized, structured, and commented CLEAR statements', () => {
  assert.equal(removeInitialScalarClears('DATA lv_count TYPE i.\nwork( ).\nCLEAR lv_count.'), 'DATA lv_count TYPE i.\nwork( ).\nCLEAR lv_count.');
  assert.equal(removeInitialScalarClears('DATA lv_count TYPE i VALUE 1.\nCLEAR lv_count.'), 'DATA lv_count TYPE i VALUE 1.\nCLEAR lv_count.');
  assert.equal(removeInitialScalarClears('DATA ls_data TYPE ty_data.\nCLEAR ls_data.'), 'DATA ls_data TYPE ty_data.\nCLEAR ls_data.');
  assert.equal(removeInitialScalarClears('DATA lv_count TYPE i.\nCLEAR lv_count. " note'), 'DATA lv_count TYPE i.\nCLEAR lv_count. " note');
});