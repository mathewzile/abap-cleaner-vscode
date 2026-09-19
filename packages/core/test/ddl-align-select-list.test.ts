import assert from 'node:assert/strict';
import test from 'node:test';

import { alignDdlSelectList } from '../src/rules/ddl/align-select-list.js';

test('aligns AS alias across select-list elements of different widths', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a.id as id,',
    '  a.longer_field as field',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a.id       as id,',
    '  a.longer_field as field',
    '}',
  ].join('\n');
  assert.equal(alignDdlSelectList(source), expected);
});

test('folds KEY into the element span rather than needing its own column', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a.id as id,',
    '  key a.longer_key as other_id',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a.id         as id,',
    '  key a.longer_key as other_id',
    '}',
  ].join('\n');
  assert.equal(alignDdlSelectList(source), expected);
});

test('does not pad an element with no AS alias, but its width still counts toward the shared column', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a.much_longer_id,',
    '  a.field as f',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a.much_longer_id,',
    '  a.field              as f',
    '}',
  ].join('\n');
  assert.equal(alignDdlSelectList(source), expected);
});

test('refuses the whole select list if any element contains a comment', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a.id as id, // a comment',
    '  a.longer_field as field',
    '}',
  ].join('\n');
  assert.equal(alignDdlSelectList(source), source);
});

test('refuses a select list with fewer than 2 elements', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a.id as id',
    '}',
  ].join('\n');
  assert.equal(alignDdlSelectList(source), source);
});

test('does not align two elements crammed onto the same source line', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a.id as id, a.longer_field as field',
    '}',
  ].join('\n');
  assert.equal(alignDdlSelectList(source), source);
});

test('does not split a comma inside a function call argument', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a.id as id,',
    '  concat_with_space( a.x, a.y, 1 ) as full_name',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a.id                         as id,',
    '  concat_with_space( a.x, a.y, 1 ) as full_name',
    '}',
  ].join('\n');
  assert.equal(alignDdlSelectList(source), expected);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a.id as id,',
    '  a.longer_field as field',
    '}',
  ].join('\n');
  const once = alignDdlSelectList(source);
  const twice = alignDdlSelectList(once);
  assert.equal(twice, once);
});
