import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeEmptyLinesInClassDefinition } from '../src/index.js';

test('limits consecutive blank lines inside a class definition', () => {
  const sourceText = 'CLASS lcl_example DEFINITION.\n\n\n  PUBLIC SECTION.\nENDCLASS.\n\n\nCLASS lcl_other DEFINITION.\nENDCLASS.';
  const cleanedCode = normalizeEmptyLinesInClassDefinition(sourceText, { maxEmptyLines: 1 });
  assert.equal(cleanedCode, 'CLASS lcl_example DEFINITION.\n\n  PUBLIC SECTION.\nENDCLASS.\n\n\nCLASS lcl_other DEFINITION.\nENDCLASS.');
});

test('does not treat a deferred class declaration as an opened definition', () => {
  const sourceText = 'CLASS lcl_example DEFINITION DEFERRED.\n\n\nCLASS lcl_other DEFINITION.\nENDCLASS.';
  assert.equal(normalizeEmptyLinesInClassDefinition(sourceText, { maxEmptyLines: 1 }), sourceText);
});