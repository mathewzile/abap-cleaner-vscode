import assert from 'node:assert/strict';
import test from 'node:test';

import { alignMethodsForTesting } from '../src/rules/syntax/align-methods-for-testing.js';

test('aligns a run of consecutive single-line METHODS ... FOR TESTING. declarations', () => {
  const source = [
    'METHODS x FOR TESTING.',
    'METHODS longer_name FOR TESTING.',
  ].join('\n');
  const expected = [
    'METHODS x           FOR TESTING.',
    'METHODS longer_name FOR TESTING.',
  ].join('\n');
  assert.equal(alignMethodsForTesting(source), expected);
});

test('a declaration with ABSTRACT, RAISING, or a trailing comment is not recognized and breaks the run', () => {
  const source = [
    'METHODS x FOR TESTING.',
    'METHODS y FOR TESTING RAISING cx_any.',
    'METHODS longer_name FOR TESTING.',
  ].join('\n');
  assert.equal(alignMethodsForTesting(source), source);
});

test('does not touch a chained METHODS: declaration', () => {
  const source = [
    'METHODS: x FOR TESTING,',
    '         y FOR TESTING.',
    'METHODS longer_name FOR TESTING.',
  ].join('\n');
  assert.equal(alignMethodsForTesting(source), source);
});

test('a lone declaration (no run of at least two) is left untouched', () => {
  const source = 'METHODS x FOR TESTING.';
  assert.equal(alignMethodsForTesting(source), source);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'METHODS x FOR TESTING.',
    'METHODS longer_name FOR TESTING.',
  ].join('\n');
  const once = alignMethodsForTesting(source);
  const twice = alignMethodsForTesting(once);
  assert.equal(twice, once);
});
