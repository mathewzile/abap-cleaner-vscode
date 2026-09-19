import assert from 'node:assert/strict';
import test from 'node:test';

import { alignDeclarations } from '../src/rules/syntax/align-declarations.js';

test('aligns a run of consecutive simple DATA declarations with no VALUE (2 columns)', () => {
  const source = [
    'DATA lv_x TYPE i.',
    'DATA lv_longer_name TYPE string.',
  ].join('\n');
  const expected = [
    'DATA lv_x           TYPE i.',
    'DATA lv_longer_name TYPE string.',
  ].join('\n');
  assert.equal(alignDeclarations(source), expected);
});

test('aligns a run of consecutive simple CONSTANTS declarations with VALUE (3 columns)', () => {
  const source = [
    'CONSTANTS lc_a TYPE i VALUE 1.',
    'CONSTANTS lc_longer_name TYPE i VALUE 22.',
  ].join('\n');
  const expected = [
    'CONSTANTS lc_a           TYPE i VALUE 1.',
    'CONSTANTS lc_longer_name TYPE i VALUE 22.',
  ].join('\n');
  assert.equal(alignDeclarations(source), expected);
});

test('does not group declarations of different keywords together', () => {
  const source = [
    'DATA lv_x TYPE i.',
    'CONSTANTS lc_longer_name TYPE i.',
  ].join('\n');
  assert.equal(alignDeclarations(source), source);
});

test('aligns the items of a single chained declaration independently', () => {
  const source = 'DATA: lv_a TYPE i,\n      lv_longer_name TYPE string.';
  const expected = 'DATA: lv_a           TYPE i,\n      lv_longer_name TYPE string.';
  assert.equal(alignDeclarations(source), expected);
});

test('a BEGIN OF structured declaration is never matched and breaks an adjacent run', () => {
  const source = [
    'DATA lv_x TYPE i.',
    'DATA: BEGIN OF ls_struc,',
    '        comp TYPE i,',
    '      END OF ls_struc.',
    'DATA lv_longer_name TYPE string.',
  ].join('\n');
  assert.equal(alignDeclarations(source), source);
});

test('a mix of VALUE-having and VALUE-lacking rows does not group together', () => {
  const source = [
    'DATA lv_x TYPE i.',
    'DATA lv_longer_name TYPE i VALUE 1.',
  ].join('\n');
  assert.equal(alignDeclarations(source), source);
});

test('does not align two declarations crammed onto the same source line', () => {
  const source = 'DATA lv_first TYPE i. DATA lv_second TYPE i.';
  assert.equal(alignDeclarations(source), source);
});

test('does not align chain items crammed onto the same source line', () => {
  const source = 'DATA: lv_a TYPE i, lv_longer_name TYPE string.';
  assert.equal(alignDeclarations(source), source);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'DATA lv_x TYPE i.',
    'DATA lv_longer_name TYPE string.',
  ].join('\n');
  const once = alignDeclarations(source);
  const twice = alignDeclarations(once);
  assert.equal(twice, once);
});
