import assert from 'node:assert/strict';
import test from 'node:test';
import { replaceSimpleIfBlockAtLoopEnd } from '../src/rules/syntax/if-block-at-loop-end.js';

test('replaces a final simple loop IF block with an early continue', () => {
  assert.equal(
    replaceSimpleIfBlockAtLoopEnd('LOOP AT lt_items INTO DATA(ls_item).\n  IF ls_item IS INITIAL.\n    WRITE ls_item.\n  ENDIF.\nENDLOOP.'),
    'LOOP AT lt_items INTO DATA(ls_item).\n  IF ls_item IS NOT INITIAL.\n    CONTINUE.\n  ENDIF.\n  WRITE ls_item.\nENDLOOP.',
  );
});

test('leaves nonfinal, complex, and commented loop IF blocks unchanged', () => {
  assert.equal(replaceSimpleIfBlockAtLoopEnd('DO 2 TIMES.\n  IF lv_ready IS INITIAL.\n    WRITE lv_ready.\n  ENDIF.\n  CONTINUE.\nENDDO.'), 'DO 2 TIMES.\n  IF lv_ready IS INITIAL.\n    WRITE lv_ready.\n  ENDIF.\n  CONTINUE.\nENDDO.');
  assert.equal(replaceSimpleIfBlockAtLoopEnd('WHILE lv_ready = abap_true.\n  IF lv_ready = abap_true.\n    WRITE lv_ready.\n  ENDIF.\nENDWHILE.'), 'WHILE lv_ready = abap_true.\n  IF lv_ready = abap_true.\n    WRITE lv_ready.\n  ENDIF.\nENDWHILE.');
  assert.equal(replaceSimpleIfBlockAtLoopEnd('LOOP AT lt_items INTO DATA(ls_item).\n  IF ls_item IS INITIAL.\n    WRITE ls_item. " keep\n  ENDIF.\nENDLOOP.'), 'LOOP AT lt_items INTO DATA(ls_item).\n  IF ls_item IS INITIAL.\n    WRITE ls_item. " keep\n  ENDIF.\nENDLOOP.');
});