import assert from 'node:assert/strict';
import test from 'node:test';

import { replaceDeclaredCondense } from '../src/index.js';

test('converts adjacent declared scalar CONDENSE statements', () => {
  assert.equal(replaceDeclaredCondense('DATA lv_text TYPE string.\nCONDENSE lv_text.'), 'DATA lv_text TYPE string.\nlv_text = condense( lv_text ).');
  assert.equal(replaceDeclaredCondense('DATA lv_code TYPE char10.\nCONDENSE lv_code NO-GAPS.'), 'DATA lv_code TYPE char10.\nlv_code = condense( val = lv_code to = `` from = ` ` ).');
});

test('keeps unproven, extended, and commented CONDENSE statements unchanged', () => {
  assert.equal(replaceDeclaredCondense('CONDENSE lv_text.'), 'CONDENSE lv_text.');
  assert.equal(replaceDeclaredCondense('DATA lv_text TYPE string.\nCONDENSE lv_other.'), 'DATA lv_text TYPE string.\nCONDENSE lv_other.');
  assert.equal(replaceDeclaredCondense('DATA lv_text TYPE string.\nCONDENSE lv_text. " note'), 'DATA lv_text TYPE string.\nCONDENSE lv_text. " note');
});