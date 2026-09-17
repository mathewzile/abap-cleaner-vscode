import assert from 'node:assert/strict';
import test from 'node:test';

import { replaceDeclaredTranslateCase } from '../src/index.js';

test('replaces adjacent declared scalar TRANSLATE upper and lower case statements', () => {
  assert.equal(replaceDeclaredTranslateCase('DATA lv_text TYPE string.\nTRANSLATE lv_text TO UPPER CASE.'), 'DATA lv_text TYPE string.\nlv_text = to_upper( lv_text ).');
  assert.equal(replaceDeclaredTranslateCase('DATA lv_text TYPE char30.\nTRANSLATE lv_text TO LOWER CASE.'), 'DATA lv_text TYPE char30.\nlv_text = to_lower( lv_text ).');
});

test('keeps unproven declarations and nonadjacent TRANSLATE statements unchanged', () => {
  assert.equal(replaceDeclaredTranslateCase('DATA ls_value TYPE ty_value.\nTRANSLATE ls_value TO UPPER CASE.'), 'DATA ls_value TYPE ty_value.\nTRANSLATE ls_value TO UPPER CASE.');
  assert.equal(replaceDeclaredTranslateCase('DATA lv_text TYPE string.\nCLEAR lv_text.\nTRANSLATE lv_text TO UPPER CASE.'), 'DATA lv_text TYPE string.\nCLEAR lv_text.\nTRANSLATE lv_text TO UPPER CASE.');
});