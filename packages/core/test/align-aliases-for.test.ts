import assert from 'node:assert/strict';
import test from 'node:test';

import { alignAliasesFor } from '../src/rules/syntax/align-aliases-for.js';

test('aligns a run of at least two consecutive ALIASES ... FOR ... statements', () => {
  const source = [
    'ALIASES x FOR if_any~x.',
    'ALIASES longer_name FOR if_any~longer_name.',
  ].join('\n');
  const expected = [
    'ALIASES x           FOR if_any~x.',
    'ALIASES longer_name FOR if_any~longer_name.',
  ].join('\n');
  assert.equal(alignAliasesFor(source), expected);
});

test('keeps aligning across a blank line and a comment line between matching statements', () => {
  const source = [
    'ALIASES x FOR if_any~x.',
    '',
    '" a comment',
    'ALIASES longer_name FOR if_any~longer_name.',
  ].join('\n');
  const expected = [
    'ALIASES x           FOR if_any~x.',
    '',
    '" a comment',
    'ALIASES longer_name FOR if_any~longer_name.',
  ].join('\n');
  assert.equal(alignAliasesFor(source), expected);
});

test('does not touch a chained ALIASES: declaration', () => {
  const source = [
    'ALIASES: x FOR if_any~x,',
    '          y FOR if_any~y.',
    'ALIASES longer_name FOR if_any~longer_name.',
  ].join('\n');
  assert.equal(alignAliasesFor(source), source);
});

test('a lone ALIASES statement (no run of at least two) is left untouched', () => {
  const source = 'ALIASES x FOR if_any~x.';
  assert.equal(alignAliasesFor(source), source);
});

test('a statement in between breaks the run', () => {
  const source = [
    'ALIASES x FOR if_any~x.',
    'DATA lv_y TYPE i.',
    'ALIASES longer_name FOR if_any~longer_name.',
  ].join('\n');
  assert.equal(alignAliasesFor(source), source);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'ALIASES x FOR if_any~x.',
    'ALIASES longer_name FOR if_any~longer_name.',
  ].join('\n');
  const once = alignAliasesFor(source);
  const twice = alignAliasesFor(once);
  assert.equal(twice, once);
});
