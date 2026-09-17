import assert from 'node:assert/strict';
import test from 'node:test';

import { makeSimpleImplicitTypesExplicit } from '../src/index.js';

test('makes a simple implicit DATA character length explicit', () => {
  assert.equal(makeSimpleImplicitTypesExplicit('DATA lv_flag.'), 'DATA lv_flag TYPE c.');
  assert.equal(makeSimpleImplicitTypesExplicit('TYPES ty_flag.'), 'TYPES ty_flag TYPE c.');
  assert.equal(makeSimpleImplicitTypesExplicit('DATA lv_text(30).'), 'DATA lv_text TYPE c LENGTH 30.');
  assert.equal(makeSimpleImplicitTypesExplicit('TYPES ty_text(30).'), 'TYPES ty_text TYPE c LENGTH 30.');
});

test('keeps unsupported implicit declarations unchanged', () => {
  assert.equal(makeSimpleImplicitTypesExplicit('DATA: lv_text.'), 'DATA: lv_text.');
  assert.equal(makeSimpleImplicitTypesExplicit('DATA: lv_text(30).'), 'DATA: lv_text(30).');
  assert.equal(makeSimpleImplicitTypesExplicit('DATA lv_text(30). " note'), 'DATA lv_text(30). " note');
});