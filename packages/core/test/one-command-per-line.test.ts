import assert from 'node:assert/strict';
import test from 'node:test';
import { moveSimpleCommandsToOwnLines } from '../src/rules/emptylines/one-command-per-line.js';

test('moves simple same-line commands to separate lines while retaining indentation', () => {
  assert.equal(
    moveSimpleCommandsToOwnLines('  DATA lv_first TYPE i. DATA lv_second TYPE i. WRITE lv_first.'),
    '  DATA lv_first TYPE i.\n  DATA lv_second TYPE i.\n  WRITE lv_first.',
  );
});

test('leaves multiline, commented, and WHEN commands unchanged', () => {
  assert.equal(moveSimpleCommandsToOwnLines('value = any_method(\n  ). WRITE value.'), 'value = any_method(\n  ). WRITE value.');
  assert.equal(moveSimpleCommandsToOwnLines('WRITE value. " keep\nWRITE next.'), 'WRITE value. " keep\nWRITE next.');
  assert.equal(moveSimpleCommandsToOwnLines('WHEN 1. WRITE value.'), 'WHEN 1. WRITE value.');
});