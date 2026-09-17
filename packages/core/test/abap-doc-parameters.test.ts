import assert from 'node:assert/strict';
import test from 'node:test';
import { addSimpleMissingAbapDocParameters } from '../src/rules/declarations/abap-doc-parameters.js';

test('adds a missing parameter entry to a simple nonsynchronized documented method', () => {
  assert.equal(
    addSimpleMissingAbapDocParameters('  "! Calculates an item total\n  METHODS calculate IMPORTING iv_count TYPE i.'),
    '  "! Calculates an item total\n  "! @parameter iv_count |\n  METHODS calculate IMPORTING iv_count TYPE i.',
  );
});

test('leaves synchronized, existing parameter, and complex method documentation unchanged', () => {
  assert.equal(addSimpleMissingAbapDocParameters('"! <p class="shorttext synchronized">Calculates</p>\nMETHODS calculate IMPORTING iv_count TYPE i.'), '"! <p class="shorttext synchronized">Calculates</p>\nMETHODS calculate IMPORTING iv_count TYPE i.');
  assert.equal(addSimpleMissingAbapDocParameters('"! @parameter iv_count | count\nMETHODS calculate IMPORTING iv_count TYPE i.'), '"! @parameter iv_count | count\nMETHODS calculate IMPORTING iv_count TYPE i.');
  assert.equal(addSimpleMissingAbapDocParameters('"! Calculates\nMETHODS calculate\n  IMPORTING iv_count TYPE i.'), '"! Calculates\nMETHODS calculate\n  IMPORTING iv_count TYPE i.');
});