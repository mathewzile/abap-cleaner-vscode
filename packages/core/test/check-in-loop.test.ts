import assert from 'node:assert/strict';
import test from 'node:test';

import { convertSimpleChecksInLoops } from '../src/index.js';

test('converts a simple CHECK in a complete LOOP', () => {
  assert.equal(
    convertSimpleChecksInLoops('LOOP AT values INTO value.\n  CHECK value IS NOT INITIAL.\nENDLOOP.'),
    'LOOP AT values INTO value.\n  IF value IS INITIAL.\n    CONTINUE.\n  ENDIF.\nENDLOOP.',
  );
});

test('keeps CHECK outside paired LOOP, DO, and WHILE blocks unchanged', () => {
  assert.equal(convertSimpleChecksInLoops('CHECK value IS INITIAL.'), 'CHECK value IS INITIAL.');
  assert.equal(convertSimpleChecksInLoops('LOOP AT values INTO value.\n  CHECK value = 1.\nENDLOOP.'), 'LOOP AT values INTO value.\n  CHECK value = 1.\nENDLOOP.');
  assert.equal(convertSimpleChecksInLoops('LOOP AT values INTO value.\n  CHECK value IS INITIAL.'), 'LOOP AT values INTO value.\n  CHECK value IS INITIAL.');
});