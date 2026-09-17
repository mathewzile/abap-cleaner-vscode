import assert from 'node:assert/strict';
import test from 'node:test';

import { replaceTerminalDescribeTableLines } from '../src/index.js';

test('replaces exact DESCRIBE TABLE LINES immediately before RETURN', () => {
  assert.equal(
    replaceTerminalDescribeTableLines('DESCRIBE TABLE lt_items LINES lv_count.\nRETURN.'),
    'lv_count = lines( lt_items ).\nRETURN.',
  );
  assert.equal(
    replaceTerminalDescribeTableLines('DESCRIBE TABLE lt_items LINES DATA(lv_count).\nRETURN.'),
    'DATA(lv_count) = lines( lt_items ).\nRETURN.',
  );
  assert.equal(
    replaceTerminalDescribeTableLines('DESCRIBE TABLE lt_items LINES FINAL(lv_count).\nRETURN.'),
    'FINAL(lv_count) = lines( lt_items ).\nRETURN.',
  );
});

test('keeps nonterminal, extended, commented, and system-field DESCRIBE statements', () => {
  assert.equal(replaceTerminalDescribeTableLines('DESCRIBE TABLE lt_items LINES lv_count.\nWRITE lv_count.'), 'DESCRIBE TABLE lt_items LINES lv_count.\nWRITE lv_count.');
  assert.equal(replaceTerminalDescribeTableLines('DESCRIBE TABLE lt_items KIND lv_kind LINES lv_count.\nRETURN.'), 'DESCRIBE TABLE lt_items KIND lv_kind LINES lv_count.\nRETURN.');
  assert.equal(replaceTerminalDescribeTableLines('DESCRIBE TABLE lt_items LINES sy-tfill.\nRETURN.'), 'DESCRIBE TABLE lt_items LINES sy-tfill.\nRETURN.');
  assert.equal(replaceTerminalDescribeTableLines('DESCRIBE TABLE lt_items LINES lv_count. " note\nRETURN.'), 'DESCRIBE TABLE lt_items LINES lv_count. " note\nRETURN.');
});