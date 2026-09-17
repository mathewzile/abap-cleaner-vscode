import assert from 'node:assert/strict';
import test from 'node:test';

import { removeEmptyProtectedSectionsFromFinalLocalClasses } from '../src/index.js';

test('removes an empty uncommented PROTECTED SECTION from a final local class', () => {
  const sourceText = 'CLASS lcl_example DEFINITION FINAL.\n  PUBLIC SECTION.\n    METHODS run.\n\n  PROTECTED SECTION.\n\n  PRIVATE SECTION.\n    DATA value TYPE i.\nENDCLASS.';
  const expected = 'CLASS lcl_example DEFINITION FINAL.\n  PUBLIC SECTION.\n    METHODS run.\n\n\n\n  PRIVATE SECTION.\n    DATA value TYPE i.\nENDCLASS.';
  assert.equal(removeEmptyProtectedSectionsFromFinalLocalClasses(sourceText), expected);
});

test('keeps non-final, non-local, commented, and non-empty sections', () => {
  assert.equal(removeEmptyProtectedSectionsFromFinalLocalClasses('CLASS lcl_example DEFINITION.\n  PROTECTED SECTION.\nENDCLASS.'), 'CLASS lcl_example DEFINITION.\n  PROTECTED SECTION.\nENDCLASS.');
  assert.equal(removeEmptyProtectedSectionsFromFinalLocalClasses('CLASS zcl_example DEFINITION FINAL.\n  PROTECTED SECTION.\nENDCLASS.'), 'CLASS zcl_example DEFINITION FINAL.\n  PROTECTED SECTION.\nENDCLASS.');
  assert.equal(removeEmptyProtectedSectionsFromFinalLocalClasses('CLASS lcl_example DEFINITION FINAL.\n  PROTECTED SECTION.\n    " Keep\nENDCLASS.'), 'CLASS lcl_example DEFINITION FINAL.\n  PROTECTED SECTION.\n    " Keep\nENDCLASS.');
  assert.equal(removeEmptyProtectedSectionsFromFinalLocalClasses('CLASS lcl_example DEFINITION FINAL.\n  PROTECTED SECTION.\n    METHODS run.\nENDCLASS.'), 'CLASS lcl_example DEFINITION FINAL.\n  PROTECTED SECTION.\n    METHODS run.\nENDCLASS.');
});

test('removes empty PUBLIC and PRIVATE sections from a final local class', () => {
  const sourceText = 'CLASS lcl_example DEFINITION FINAL.\n  PUBLIC SECTION.\n\n  PROTECTED SECTION.\n    METHODS run.\n\n  PRIVATE SECTION.\nENDCLASS.';
  const expected = 'CLASS lcl_example DEFINITION FINAL.\n\n\n  PROTECTED SECTION.\n    METHODS run.\n\n\nENDCLASS.';
  assert.equal(removeEmptyProtectedSectionsFromFinalLocalClasses(sourceText), expected);
});