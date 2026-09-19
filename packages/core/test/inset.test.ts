import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeIndentation } from '../src/index.js';

test('reindents a misindented method body, including IF/ELSE/ENDIF', () => {
  const source = [
    'METHOD do_something.',
    'DATA lv_x TYPE i.',
    'IF lv_x = 1.',
    'lv_x = 2.',
    'ELSE.',
    'lv_x = 3.',
    'ENDIF.',
    'ENDMETHOD.',
  ].join('\n');
  const expected = [
    'METHOD do_something.',
    '  DATA lv_x TYPE i.',
    '  IF lv_x = 1.',
    '    lv_x = 2.',
    '  ELSE.',
    '    lv_x = 3.',
    '  ENDIF.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(normalizeIndentation(source), expected);
});

test('aligns a comment line attached above a statement with that statement', () => {
  const source = [
    'METHOD do_something.',
    'DATA lv_x TYPE i.',
    '"comment',
    'lv_x = 1.',
    'ENDMETHOD.',
  ].join('\n');
  const expected = [
    'METHOD do_something.',
    '  DATA lv_x TYPE i.',
    '  "comment',
    '  lv_x = 1.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(normalizeIndentation(source), expected);
});

test('leaves chained same-line statements and continuation lines untouched', () => {
  const chained = [
    'METHOD do_something.',
    'lv_a = 1. lv_b = 2.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(normalizeIndentation(chained), [
    'METHOD do_something.',
    '  lv_a = 1. lv_b = 2.',
    'ENDMETHOD.',
  ].join('\n'));

  const continuation = [
    'METHOD do_something.',
    'CALL METHOD do_other',
    '  EXPORTING',
    '      iv_x = 1.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(normalizeIndentation(continuation), [
    'METHOD do_something.',
    '  CALL METHOD do_other',
    '  EXPORTING',
    '      iv_x = 1.',
    'ENDMETHOD.',
  ].join('\n'));
});

test('leaves the file unchanged when a mid-block keyword has no matching enclosing block', () => {
  const source = [
    'METHOD do_something.',
    'ELSE.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(normalizeIndentation(source), source);
});
