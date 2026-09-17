import assert from 'node:assert/strict';
import test from 'node:test';

import { convertSimpleChecksOutsideLoops } from '../src/index.js';

test('converts a simple CHECK outside loops in a complete procedure', () => {
  assert.equal(
    convertSimpleChecksOutsideLoops('METHOD run.\n  CHECK lv_ready IS NOT INITIAL.\nENDMETHOD.'),
    'METHOD run.\n  IF lv_ready IS INITIAL.\n    RETURN.\n  ENDIF.\nENDMETHOD.',
  );
});

test('keeps CHECK within a loop and unsupported forms unchanged', () => {
  assert.equal(convertSimpleChecksOutsideLoops('METHOD run.\n  LOOP AT values INTO value.\n    CHECK value IS INITIAL.\n  ENDLOOP.\nENDMETHOD.'), 'METHOD run.\n  LOOP AT values INTO value.\n    CHECK value IS INITIAL.\n  ENDLOOP.\nENDMETHOD.');
  assert.equal(convertSimpleChecksOutsideLoops('CHECK value IS INITIAL.'), 'CHECK value IS INITIAL.');
  assert.equal(convertSimpleChecksOutsideLoops('METHOD run.\n  CHECK value = 1.\nENDMETHOD.'), 'METHOD run.\n  CHECK value = 1.\nENDMETHOD.');
});