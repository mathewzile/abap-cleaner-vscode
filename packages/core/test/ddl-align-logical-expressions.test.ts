import assert from 'node:assert/strict';
import test from 'node:test';

import { alignDdlLogicalExpressions } from '../src/rules/ddl/align-logical-expressions.js';

test('aligns a 3-condition AND chain in a JOIN ON condition', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '    inner join I_ThirdEntity',
    '      on a = 1',
    '      and bb = 22',
    '      and c = 3',
    '{',
    '  key a',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '    inner join I_ThirdEntity',
    '      on a = 1',
    '      and bb = 22',
    '      and c  = 3',
    '{',
    '  key a',
    '}',
  ].join('\n');
  assert.equal(alignDdlLogicalExpressions(source), expected);
});

test('aligns an OR chain in an ASSOCIATION ON condition', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '  association [0..*] to I_ThirdEntity as _Third',
    '    on a = 1',
    '    or bb = 22',
    '    or c = 3',
    '{',
    '  key a',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '  association [0..*] to I_ThirdEntity as _Third',
    '    on a = 1',
    '    or bb = 22',
    '    or c  = 3',
    '{',
    '  key a',
    '}',
  ].join('\n');
  assert.equal(alignDdlLogicalExpressions(source), expected);
});

test('does not touch a lone ON condition (no AND/OR continuation)', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '    inner join I_ThirdEntity',
    '      on a = 1',
    '{',
    '  key a',
    '}',
  ].join('\n');
  assert.equal(alignDdlLogicalExpressions(source), source);
});

test('refuses a chain mixing AND and OR', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '    inner join I_ThirdEntity',
    '      on a = 1',
    '      and bb = 22',
    '      or c = 3',
    '{',
    '  key a',
    '}',
  ].join('\n');
  assert.equal(alignDdlLogicalExpressions(source), source);
});

test('does not touch conditions past the ON clause boundary (WHERE)', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '    inner join I_ThirdEntity',
    '      on a = 1',
    '      and bb = 22',
    '      and c = 3',
    '  where d = 4',
    '  and ee = 55',
    '{',
    '  key a',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '    inner join I_ThirdEntity',
    '      on a = 1',
    '      and bb = 22',
    '      and c  = 3',
    '  where d = 4',
    '  and ee = 55',
    '{',
    '  key a',
    '}',
  ].join('\n');
  assert.equal(alignDdlLogicalExpressions(source), expected);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '    inner join I_ThirdEntity',
    '      on a = 1',
    '      and bb = 22',
    '      and c = 3',
    '{',
    '  key a',
    '}',
  ].join('\n');
  const once = alignDdlLogicalExpressions(source);
  const twice = alignDdlLogicalExpressions(once);
  assert.equal(twice, once);
});
