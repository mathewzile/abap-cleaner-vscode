import assert from 'node:assert/strict';
import test from 'node:test';

import { replaceExitOutsideLoops } from '../src/index.js';

test('replaces bare EXIT outside loops in complete procedures', () => {
  assert.equal(replaceExitOutsideLoops('METHOD run.\n  IF failed = abap_true.\n    EXIT.\n  ENDIF.\nENDMETHOD.'), 'METHOD run.\n  IF failed = abap_true.\n    RETURN.\n  ENDIF.\nENDMETHOD.');
  assert.equal(replaceExitOutsideLoops('FORM run.\n  EXIT.\nENDFORM.'), 'FORM run.\n  RETURN.\nENDFORM.');
});

test('keeps EXIT inside loops and outside complete procedures', () => {
  assert.equal(replaceExitOutsideLoops('METHOD run.\n  LOOP AT values INTO value.\n    EXIT.\n  ENDLOOP.\nENDMETHOD.'), 'METHOD run.\n  LOOP AT values INTO value.\n    EXIT.\n  ENDLOOP.\nENDMETHOD.');
  assert.equal(replaceExitOutsideLoops('IF failed = abap_true.\n  EXIT.\nENDIF.'), 'IF failed = abap_true.\n  EXIT.\nENDIF.');
  assert.equal(replaceExitOutsideLoops('METHOD run.\n  EXIT value.\nENDMETHOD.'), 'METHOD run.\n  EXIT value.\nENDMETHOD.');
});