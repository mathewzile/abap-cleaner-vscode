import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSimpleClassDefinitionOptions } from '../src/rules/declarations/class-definition.js';

test('places PUBLIC before FINAL in a simple one-line class definition', () => {
  assert.equal(normalizeSimpleClassDefinitionOptions('CLASS lcl_item DEFINITION FINAL PUBLIC.'), 'CLASS lcl_item DEFINITION PUBLIC FINAL.');
  assert.equal(normalizeSimpleClassDefinitionOptions('  CLASS cl_item DEFINITION FINAL PUBLIC.'), '  CLASS cl_item DEFINITION PUBLIC FINAL.');
});

test('leaves class definitions with comments or additional options unchanged', () => {
  assert.equal(normalizeSimpleClassDefinitionOptions('CLASS lcl_item DEFINITION FINAL PUBLIC. " keep'), 'CLASS lcl_item DEFINITION FINAL PUBLIC. " keep');
  assert.equal(normalizeSimpleClassDefinitionOptions('CLASS lcl_item DEFINITION FINAL PUBLIC CREATE PRIVATE.'), 'CLASS lcl_item DEFINITION FINAL PUBLIC CREATE PRIVATE.');
});