import assert from 'node:assert/strict';
import test from 'node:test';

import { alignDdlDataSources } from '../src/rules/ddl/align-data-sources.js';

test('aligns AS alias across the main FROM data source and a JOIN', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity as a',
    '    inner join I_ThirdEntityXL as thirdalias',
    '      on a.id = thirdalias.id',
    '{',
    '  key a.id',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity   as a',
    '    inner join I_ThirdEntityXL as thirdalias',
    '      on a.id = thirdalias.id',
    '{',
    '  key a.id',
    '}',
  ].join('\n');
  assert.equal(alignDdlDataSources(source), expected);
});

test('aligns ON condition across multiple JOINs, independent of AS alias width', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity as a',
    '    inner join I_ThirdEntityXL as b on a.id = b.id',
    '    inner join I_FourthEntity as ccc on a.id = ccc.id',
    '{',
    '  key a.id',
    '}',
  ].join('\n');
  const result = alignDdlDataSources(source);
  const lines = result.split('\n');
  const joinLine2 = lines.find((line) => line.includes('I_ThirdEntityXL'))!;
  const joinLine3 = lines.find((line) => line.includes('I_FourthEntity'))!;
  assert.equal(joinLine2.indexOf('on'), joinLine3.indexOf('on'));
});

test('does not pad a data source with no AS alias, but its width still counts toward the shared column', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntityMuchLonger',
    '    inner join I_ThirdEntityXL as b',
    '{',
    '  key a.id',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntityMuchLonger',
    '    inner join I_ThirdEntityXL         as b',
    '{',
    '  key a.id',
    '}',
  ].join('\n');
  assert.equal(alignDdlDataSources(source), expected);
});

test('does not touch a lone FROM data source (no JOIN, nothing to align against)', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity as a',
    '{',
    '  key a.id',
    '}',
  ].join('\n');
  assert.equal(alignDdlDataSources(source), source);
});

test('aligns a parameterized data source using its whole name( params ) span as one cell', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity( p1 : 1 ) as a',
    '    inner join I_ThirdEntityXL as thirdalias',
    '      on a.id = thirdalias.id',
    '{',
    '  key a.id',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity( p1 : 1 ) as a',
    '    inner join I_ThirdEntityXL         as thirdalias',
    '      on a.id = thirdalias.id',
    '{',
    '  key a.id',
    '}',
  ].join('\n');
  assert.equal(alignDdlDataSources(source), expected);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity as a',
    '    inner join I_ThirdEntityXL as thirdalias',
    '      on a.id = thirdalias.id',
    '{',
    '  key a.id',
    '}',
  ].join('\n');
  const once = alignDdlDataSources(source);
  const twice = alignDdlDataSources(once);
  assert.equal(twice, once);
});
