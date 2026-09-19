import assert from 'node:assert/strict';
import test from 'node:test';

import { alignSelectLists } from '../src/rules/syntax/align-select-lists.js';

test('forces a select list of tilde-qualified fields onto one field per line, hang-indented to the first field', () => {
  const source = [
    'SELECT t1~field1, t1~field2,',
    't2~field3',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  const expected = [
    'SELECT t1~field1,',
    '       t1~field2,',
    '       t2~field3',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectLists(source), expected);
});

test('aligns the AS column of fields with differently-sized names', () => {
  const source = [
    'SELECT t1~field1 AS a, t1~longer_field AS bb',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  const expected = [
    'SELECT t1~field1       AS a,',
    '       t1~longer_field AS bb',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectLists(source), expected);
});

test('does not pad a field with no AS addition, but its width still counts toward the shared column', () => {
  const source = [
    'SELECT t1~longer_field, t1~x AS y',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  const expected = [
    'SELECT t1~longer_field,',
    '       t1~x            AS y',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectLists(source), expected);
});

test('does not mistake a nested AS inside a function call for the field\'s own alias', () => {
  // NOTE: uses a period-free type name (`int4`, not `abap.int4`) — this port's ABAP command parser
  // has its own pre-existing, separate limitation where it splits statements on ANY '.' token
  // without checking for trailing whitespace, so a dotted built-in type reference like `abap.int4`
  // would be misread as ending the statement. That is a parser-level issue unrelated to what this
  // test verifies (nested AS handling) and is out of scope here.
  const source = [
    'SELECT CAST( t1~x AS int4 ), t1~longer_field AS bb',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  const expected = [
    'SELECT CAST( t1~x AS int4 ),',
    '       t1~longer_field      AS bb',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectLists(source), expected);
});

test('treats a field with an AS addition as complex (multi-token) even without a tilde', () => {
  const source = [
    'SELECT 1 AS one_field, 2 AS two_field',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  const expected = [
    'SELECT 1 AS one_field,',
    '       2 AS two_field',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectLists(source), expected);
});

test('refuses a select list mixing simple and complex fields', () => {
  const source = [
    'SELECT t1~field1, field2',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectLists(source), source);
});

test('refuses a select list where every field is simple (bare identifiers)', () => {
  const source = [
    'SELECT field1, field2',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectLists(source), source);
});

test('refuses a single-field select list (nothing to reposition against)', () => {
  const source = [
    'SELECT t1~field1',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectLists(source), source);
});

test('refuses a bare select-all field', () => {
  const source = [
    'SELECT *',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectLists(source), source);
});

test('refuses a select list of literal and host-variable fields (both simple, single-token)', () => {
  const source = [
    "SELECT 'X', @lv_value",
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectLists(source), source);
});

test('refuses a whitespace-separated (no comma) select list', () => {
  const source = [
    'SELECT SINGLE t1~field1 t2~field2',
    '  FROM tab',
    '  INTO @ls_result.',
  ].join('\n');
  assert.equal(alignSelectLists(source), source);
});

test('does not split a comma inside a function call argument list', () => {
  const source = [
    'SELECT SUM( t1~amount ), t1~currency',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  const expected = [
    'SELECT SUM( t1~amount ),',
    '       t1~currency',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectLists(source), expected);
});

test('does not misparse a CASE expression field (no bracket depth to rely on)', () => {
  const source = [
    'SELECT CASE WHEN t1~flag = abap_true THEN 1 ELSE 0 END AS flag_value,',
    't1~other_field',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  const expected = [
    'SELECT CASE WHEN t1~flag = abap_true THEN 1 ELSE 0 END AS flag_value,',
    '       t1~other_field',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectLists(source), expected);
});

test('leaves an already single-line statement completely untouched', () => {
  const source = 'SELECT t1~field1, t1~field2 FROM tab INTO TABLE @lt_result.';
  assert.equal(alignSelectLists(source), source);
});

test('refuses a statement with a subquery', () => {
  const source = [
    'SELECT t1~field1, t1~field2',
    '  FROM tab',
    '  WHERE c IN ( SELECT c',
    '                 FROM other )',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  assert.equal(alignSelectLists(source), source);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'SELECT t1~field1, t1~field2,',
    't2~field3',
    '  FROM tab',
    '  INTO TABLE @lt_result.',
  ].join('\n');
  const once = alignSelectLists(source);
  const twice = alignSelectLists(once);
  assert.equal(twice, once);
});
