import assert from 'node:assert/strict';
import test from 'node:test';

import { alignSelectClauses } from '../src/rules/syntax/align-select-clauses.js';

test('repositions clause keywords onto their own line at SELECT column + 2', () => {
  const source = [
    'SELECT a, b',
    '    FROM tab',
    ' WHERE c = 1',
    'INTO TABLE @lt_result.',
  ].join('\n');
  const expected = [
    'SELECT a, b',
    '  FROM tab',
    '  WHERE c = 1',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectClauses(source), expected);
});

test('condenses and repositions GROUP BY and ORDER BY', () => {
  const source = [
    'SELECT a, b',
    '  FROM tab',
    '  WHERE c = 1',
    'GROUP',
    'BY a',
    'ORDER BY a',
    'INTO TABLE @lt_result.',
  ].join('\n');
  const expected = [
    'SELECT a, b',
    '  FROM tab',
    '  WHERE c = 1',
    '  GROUP BY a',
    '  ORDER BY a',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectClauses(source), expected);
});

test('leaves an already single-line statement completely untouched', () => {
  const source = 'SELECT a FROM tab WHERE c = 1 INTO TABLE @lt_result.';
  assert.equal(alignSelectClauses(source), source);
});

test('leaves a FROM with no JOIN glued to the SELECT line untouched', () => {
  const source = [
    'SELECT a, b FROM tab',
    '  WHERE c = 1',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  const expected = [
    'SELECT a, b FROM tab',
    '  WHERE c = 1',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectClauses(source), expected);
});

test('repositions a FROM glued to SELECT when it contains a JOIN', () => {
  const source = [
    'SELECT a, b FROM tab1 INNER JOIN tab2 ON tab1~id = tab2~id',
    '  WHERE c = 1',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  const expected = [
    'SELECT a, b',
    '  FROM tab1 INNER JOIN tab2 ON tab1~id = tab2~id',
    '  WHERE c = 1',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectClauses(source), expected);
});

test('refuses a statement with a subquery', () => {
  const source = [
    'SELECT a, b',
    '  FROM tab',
    '  WHERE c IN ( SELECT c',
    '                 FROM other )',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectClauses(source), source);
});

test('refuses a UNION query', () => {
  const source = [
    'SELECT a',
    '  FROM tab1',
    'UNION',
    'SELECT a',
    '  FROM tab2',
    'INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectClauses(source), source);
});

test('refuses a statement with FOR ALL ENTRIES', () => {
  const source = [
    'SELECT a, b',
    '  FROM tab',
    '  FOR ALL ENTRIES IN lt_keys',
    '  WHERE c = lt_keys-c',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectClauses(source), source);
});

test('refuses a statement with %_HINTS', () => {
  const source = [
    'SELECT a, b',
    '  FROM tab',
    '  WHERE c = 1',
    '  INTO TABLE @lt_result',
    '  %_HINTS ORACLE \'ANY_HINT\'.',
  ].join('\n');
  assert.equal(alignSelectClauses(source), source);
});

test('refuses the SELECT ... ENDSELECT loop form', () => {
  const source = [
    'SELECT a, b',
    '    FROM tab',
    '  WHERE c = 1',
    'INTO ls_row.',
    'ENDSELECT.',
  ].join('\n');
  assert.equal(alignSelectClauses(source), source);
});

test('refuses %_HINTS in non-standard casing (boundary check for the shared refusal helper)', () => {
  const source = [
    'SELECT a, b',
    '  FROM tab',
    '  WHERE c = 1',
    '  %_hints ORACLE \'ANY_HINT\'.',
  ].join('\n');
  assert.equal(alignSelectClauses(source), source);
});

test('refuses FOR ALL ENTRIES even when split across lines (boundary check for the shared refusal helper)', () => {
  const source = [
    'SELECT a, b',
    '  FROM tab',
    '  FOR ALL',
    '  ENTRIES IN lt_keys',
    '  WHERE c = lt_keys-c',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectClauses(source), source);
});

test('leaves a single-line statement with a trailing comment on the next line untouched (boundary check)', () => {
  const source = [
    'SELECT a FROM tab WHERE c = 1 INTO TABLE @lt_result.',
    '* comment on its own line',
  ].join('\n');
  assert.equal(alignSelectClauses(source), source);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'SELECT a, b',
    '    FROM tab',
    ' WHERE c = 1',
    'INTO TABLE @lt_result.',
  ].join('\n');
  const once = alignSelectClauses(source);
  const twice = alignSelectClauses(once);
  assert.equal(twice, once);
});
