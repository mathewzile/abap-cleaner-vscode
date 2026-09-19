import assert from 'node:assert/strict';
import test from 'node:test';

import { alignMethodsRedefinition } from '../src/rules/syntax/align-methods-redefinition.js';

test('aligns a run of consecutive single-line METHODS ... REDEFINITION. declarations', () => {
  const source = [
    'METHODS if_any~x REDEFINITION.',
    'METHODS if_any~longer_name REDEFINITION.',
  ].join('\n');
  const expected = [
    'METHODS if_any~x           REDEFINITION.',
    'METHODS if_any~longer_name REDEFINITION.',
  ].join('\n');
  assert.equal(alignMethodsRedefinition(source), expected);
});

test('does not align a FINAL REDEFINITION declaration (two-token variant is out of scope) and it breaks the run', () => {
  const source = [
    'METHODS if_any~x REDEFINITION.',
    'METHODS if_any~y FINAL REDEFINITION.',
    'METHODS if_any~longer_name REDEFINITION.',
  ].join('\n');
  assert.equal(alignMethodsRedefinition(source), source);
});

test('does not touch a multi-line REDEFINITION declaration', () => {
  const source = [
    'METHODS if_any~medium_method_name',
    '  REDEFINITION.',
    'METHODS if_any~x REDEFINITION.',
  ].join('\n');
  assert.equal(alignMethodsRedefinition(source), source);
});

test('does not touch a chained METHODS: declaration', () => {
  const source = [
    'METHODS: if_any~x REDEFINITION,',
    '         if_any~y REDEFINITION.',
    'METHODS if_any~longer_name REDEFINITION.',
  ].join('\n');
  assert.equal(alignMethodsRedefinition(source), source);
});

test('a lone declaration (no run of at least two) is left untouched', () => {
  const source = 'METHODS if_any~x REDEFINITION.';
  assert.equal(alignMethodsRedefinition(source), source);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'METHODS if_any~x REDEFINITION.',
    'METHODS if_any~longer_name REDEFINITION.',
  ].join('\n');
  const once = alignMethodsRedefinition(source);
  const twice = alignMethodsRedefinition(once);
  assert.equal(twice, once);
});
