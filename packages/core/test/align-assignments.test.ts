import assert from 'node:assert/strict';
import test from 'node:test';

import { alignAssignmentsToSameStructure } from '../src/rules/syntax/align-assignments.js';

test('aligns two consecutive assignments to the same structure, padding the shorter identifier and right-aligning the operator', () => {
  const source = [
    'ls_struc-a = 1.',
    'ls_struc-longer_field += 2.',
  ].join('\n');
  const expected = [
    'ls_struc-a             = 1.',
    'ls_struc-longer_field += 2.',
  ].join('\n');
  assert.equal(alignAssignmentsToSameStructure(source), expected);
});

test('keeps aligning across a blank line and a comment line between matching assignments', () => {
  const source = [
    'ls_struc-a = 1.',
    '',
    '" a comment',
    'ls_struc-longer_field += 2.',
  ].join('\n');
  const expected = [
    'ls_struc-a             = 1.',
    '',
    '" a comment',
    'ls_struc-longer_field += 2.',
  ].join('\n');
  assert.equal(alignAssignmentsToSameStructure(source), expected);
});

test('does not align assignments to different structures together', () => {
  const source = [
    'ls_first-a = 1.',
    'ls_second-longer_field = 2.',
  ].join('\n');
  assert.equal(alignAssignmentsToSameStructure(source), source);
});

test('never groups a plain (non-structure) assignment, even next to another one', () => {
  const source = [
    'lv_a = 1.',
    'lv_longer_name = 2.',
  ].join('\n');
  assert.equal(alignAssignmentsToSameStructure(source), source);
});

test('a statement in between breaks the run even if the structure matches on both sides', () => {
  const source = [
    'ls_struc-a = 1.',
    'do_something( ).',
    'ls_struc-longer_field = 2.',
  ].join('\n');
  assert.equal(alignAssignmentsToSameStructure(source), source);
});

test('a lone assignment (no run of at least two) is left untouched', () => {
  const source = 'ls_struc-a = 1.';
  assert.equal(alignAssignmentsToSameStructure(source), source);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'ls_struc-a = 1.',
    'ls_struc-longer_field += 2.',
  ].join('\n');
  const once = alignAssignmentsToSameStructure(source);
  const twice = alignAssignmentsToSameStructure(once);
  assert.equal(twice, once);
});
