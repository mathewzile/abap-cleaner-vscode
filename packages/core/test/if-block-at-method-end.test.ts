import assert from 'node:assert/strict';
import test from 'node:test';
import { replaceSimpleIfBlockAtMethodEnd } from '../src/rules/syntax/if-block-at-method-end.js';

test('replaces a final simple method IF block with an early return', () => {
  assert.equal(
    replaceSimpleIfBlockAtMethodEnd('METHOD run.\n  IF iv_ready IS INITIAL.\n    WRITE iv_ready.\n  ENDIF.\nENDMETHOD.'),
    'METHOD run.\n  IF iv_ready IS NOT INITIAL.\n    RETURN.\n  ENDIF.\n  WRITE iv_ready.\nENDMETHOD.',
  );
});

test('leaves nonfinal, complex, commented, and multi-command IF blocks unchanged', () => {
  assert.equal(replaceSimpleIfBlockAtMethodEnd('METHOD run.\n  IF iv_ready IS INITIAL.\n    WRITE iv_ready.\n  ENDIF.\n  RETURN.\nENDMETHOD.'), 'METHOD run.\n  IF iv_ready IS INITIAL.\n    WRITE iv_ready.\n  ENDIF.\n  RETURN.\nENDMETHOD.');
  assert.equal(replaceSimpleIfBlockAtMethodEnd('METHOD run.\n  IF iv_ready = abap_true.\n    WRITE iv_ready.\n  ENDIF.\nENDMETHOD.'), 'METHOD run.\n  IF iv_ready = abap_true.\n    WRITE iv_ready.\n  ENDIF.\nENDMETHOD.');
  assert.equal(replaceSimpleIfBlockAtMethodEnd('METHOD run.\n  IF iv_ready IS INITIAL.\n    WRITE iv_ready. " keep\n  ENDIF.\nENDMETHOD.'), 'METHOD run.\n  IF iv_ready IS INITIAL.\n    WRITE iv_ready. " keep\n  ENDIF.\nENDMETHOD.');
});