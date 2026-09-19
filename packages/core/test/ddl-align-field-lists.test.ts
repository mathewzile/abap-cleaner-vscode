import assert from 'node:assert/strict';
import test from 'node:test';

import { alignDdlFieldLists } from '../src/rules/ddl/align-field-lists.js';

test('forces an already single-line GROUP BY field list onto one field per line', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a,',
    '  sum( b ) as total_b',
    '}',
    'group by a, c, d',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a,',
    '  sum( b ) as total_b',
    '}',
    'group by a,',
    '         c,',
    '         d',
  ].join('\n');
  assert.equal(alignDdlFieldLists(source), expected);
});

test('re-indents an already multi-line GROUP BY field list to the first field\'s column', () => {
  const source = [
    'group by a,',
    '  c,',
    '      d',
  ].join('\n');
  const expected = [
    'group by a,',
    '         c,',
    '         d',
  ].join('\n');
  assert.equal(alignDdlFieldLists(source), expected);
});

test('does not split a comma inside a function call argument', () => {
  const source = 'group by a, sum( b, c ), d';
  const expected = [
    'group by a,',
    '         sum( b, c ),',
    '         d',
  ].join('\n');
  assert.equal(alignDdlFieldLists(source), expected);
});

test('stops the field list at HAVING', () => {
  const source = 'group by a, c having sum( b ) > 1';
  const expected = [
    'group by a,',
    '         c having sum( b ) > 1',
  ].join('\n');
  assert.equal(alignDdlFieldLists(source), expected);
});

test('stops the field list at the statement terminator (;) rather than running into trailing code', () => {
  const source = [
    'group by a, c;',
    'define view entity I_OtherView as select from I_ThirdEntity',
    '{',
    '  key x,',
    '  y',
    '}',
  ].join('\n');
  const expected = [
    'group by a,',
    '         c;',
    'define view entity I_OtherView as select from I_ThirdEntity',
    '{',
    '  key x,',
    '  y',
    '}',
  ].join('\n');
  assert.equal(alignDdlFieldLists(source), expected);
});

test('does not treat a GROUP BY inside a subquery as top-level (nested in parens)', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a',
    '}',
    'where a in (',
    '  select b from I_ThirdEntity group by b, c',
    ')',
  ].join('\n');
  assert.equal(alignDdlFieldLists(source), source);
});

test('does not touch a single-field GROUP BY (nothing to reposition against)', () => {
  const source = 'group by a';
  assert.equal(alignDdlFieldLists(source), source);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = 'group by a, c, d';
  const once = alignDdlFieldLists(source);
  const twice = alignDdlFieldLists(once);
  assert.equal(twice, once);
});
