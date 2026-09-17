import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeEmptyLinesWithinMethods } from '../src/index.js';

test('limits consecutive blank lines inside a method', () => {
  const sourceText = 'CLASS lcl_example IMPLEMENTATION.\n  METHOD run.\n\n\n    WRITE value.\n  ENDMETHOD.\n\n\nENDCLASS.';
  const cleanedCode = normalizeEmptyLinesWithinMethods(sourceText, { maxEmptyLinesWithinMethods: 1 });
  assert.equal(cleanedCode, 'CLASS lcl_example IMPLEMENTATION.\n  METHOD run.\n\n    WRITE value.\n  ENDMETHOD.\n\n\nENDCLASS.');
});

test('honors the configured empty-line limit', () => {
  const sourceText = '  METHOD run.\r\n\r\n    WRITE value.\r\n  ENDMETHOD.';
  assert.equal(
    normalizeEmptyLinesWithinMethods(sourceText, { maxEmptyLinesWithinMethods: 0 }),
    '  METHOD run.\r\n    WRITE value.\r\n  ENDMETHOD.',
  );
});