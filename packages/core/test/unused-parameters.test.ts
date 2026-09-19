import assert from 'node:assert/strict';
import test from 'node:test';

import { reportUnusedImportingParameters } from '../src/rules/declarations/unused-parameters.js';

test('adds a TODO comment for an IMPORTING parameter never referenced in the method body', () => {
  const source = [
    'CLASS cl_any DEFINITION.',
    '  PUBLIC SECTION.',
    '    METHODS any_method',
    '      IMPORTING iv_used   TYPE i',
    '                iv_unused TYPE string.',
    'ENDCLASS.',
    '',
    'CLASS cl_any IMPLEMENTATION.',
    '  METHOD any_method.',
    '    CLEAR iv_used.',
    '  ENDMETHOD.',
    'ENDCLASS.',
  ].join('\n');
  const expected = [
    'CLASS cl_any DEFINITION.',
    '  PUBLIC SECTION.',
    '    METHODS any_method',
    '      IMPORTING iv_used   TYPE i',
    '                iv_unused TYPE string.',
    'ENDCLASS.',
    '',
    'CLASS cl_any IMPLEMENTATION.',
    '  METHOD any_method.',
    '    " TODO: parameter IV_UNUSED is never used (ABAP cleaner)',
    '    CLEAR iv_used.',
    '  ENDMETHOD.',
    'ENDCLASS.',
  ].join('\n');
  assert.equal(reportUnusedImportingParameters(source), expected);
});

test('skips a parameter marked ##NEEDED', () => {
  const source = [
    'CLASS cl_any DEFINITION.',
    '  PUBLIC SECTION.',
    '    METHODS any_method',
    '      IMPORTING iv_unused TYPE string ##NEEDED.',
    'ENDCLASS.',
    '',
    'CLASS cl_any IMPLEMENTATION.',
    '  METHOD any_method.',
    '    RETURN.',
    '  ENDMETHOD.',
    'ENDCLASS.',
  ].join('\n');
  assert.equal(reportUnusedImportingParameters(source), source);
});

test('treats a parameter referenced only in a comment as used, matching UNUSED_VARIABLES', () => {
  const source = [
    'CLASS cl_any DEFINITION.',
    '  PUBLIC SECTION.',
    '    METHODS any_method',
    '      IMPORTING iv_unused TYPE string.',
    'ENDCLASS.',
    '',
    'CLASS cl_any IMPLEMENTATION.',
    '  METHOD any_method.',
    '    " iv_unused will be used later',
    '    RETURN.',
    '  ENDMETHOD.',
    'ENDCLASS.',
  ].join('\n');
  assert.equal(reportUnusedImportingParameters(source), source);
});

test('does not add a TODO for a method with no executable statement in its body', () => {
  const source = [
    'CLASS cl_any DEFINITION.',
    '  PUBLIC SECTION.',
    '    METHODS any_method',
    '      IMPORTING iv_unused TYPE string.',
    'ENDCLASS.',
    '',
    'CLASS cl_any IMPLEMENTATION.',
    '  METHOD any_method.',
    '  ENDMETHOD.',
    'ENDCLASS.',
  ].join('\n');
  assert.equal(reportUnusedImportingParameters(source), source);
});

test('refuses a parameter with a complex type clause (TYPE REF TO) rather than risk a wrong signature read', () => {
  const source = [
    'CLASS cl_any DEFINITION.',
    '  PUBLIC SECTION.',
    '    METHODS any_method',
    '      IMPORTING io_unused TYPE REF TO object.',
    'ENDCLASS.',
    '',
    'CLASS cl_any IMPLEMENTATION.',
    '  METHOD any_method.',
    '    RETURN.',
    '  ENDMETHOD.',
    'ENDCLASS.',
  ].join('\n');
  assert.equal(reportUnusedImportingParameters(source), source);
});

test('is idempotent: running twice does not duplicate the TODO comment', () => {
  const source = [
    'CLASS cl_any DEFINITION.',
    '  PUBLIC SECTION.',
    '    METHODS any_method',
    '      IMPORTING iv_unused TYPE string.',
    'ENDCLASS.',
    '',
    'CLASS cl_any IMPLEMENTATION.',
    '  METHOD any_method.',
    '    RETURN.',
    '  ENDMETHOD.',
    'ENDCLASS.',
  ].join('\n');
  const once = reportUnusedImportingParameters(source);
  const twice = reportUnusedImportingParameters(once);
  assert.equal(twice, once);
});
