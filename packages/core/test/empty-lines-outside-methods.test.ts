import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeEmptyLinesOutsideMethods } from '../src/index.js';

test('standardizes blank lines directly between class and interface blocks', () => {
  const sourceText = 'CLASS lcl_one DEFINITION.\nENDCLASS.\n\n\n\nINTERFACE lif_two.\nENDINTERFACE.\nCLASS lcl_three IMPLEMENTATION.\nENDCLASS.';
  const cleanedCode = normalizeEmptyLinesOutsideMethods(sourceText, { emptyLinesBetweenClasses: 2 });
  assert.equal(cleanedCode, 'CLASS lcl_one DEFINITION.\nENDCLASS.\n\n\nINTERFACE lif_two.\nENDINTERFACE.\n\n\nCLASS lcl_three IMPLEMENTATION.\nENDCLASS.');
});

test('does not change comments between blocks', () => {
  const sourceText = 'ENDCLASS.\n" comment for next class\nCLASS lcl_two DEFINITION.';
  assert.equal(normalizeEmptyLinesOutsideMethods(sourceText, { emptyLinesBetweenClasses: 2 }), sourceText);
});