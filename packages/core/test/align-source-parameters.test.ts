import assert from 'node:assert/strict';
import test from 'node:test';

import { alignDdlSourceParameters } from '../src/rules/ddl/align-source-parameters.js';

test('aligns simple single-token parameter values passed to a FROM data source', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '  (',
    '   P_AnyParam : a,',
    '     P_OtherParam    :   bb',
    '  )',
    '  as OtherAlias',
    '{',
    '  key OtherAlias.AnyKeyField',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '  (',
    '   P_AnyParam   : a,',
    '     P_OtherParam : bb',
    '  )',
    '  as OtherAlias',
    '{',
    '  key OtherAlias.AnyKeyField',
    '}',
  ].join('\n');
  assert.equal(alignDdlSourceParameters(source), expected);
});

test('aligns simple parameters passed to a JOIN data source', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '    inner join I_ThirdEntity',
    '          (P_AnyParam  :  a,',
    '          P_FourthParameter: bb)',
    '          as ThirdAlias',
    '      on OtherAlias.AnyKeyField = ThirdAlias.AnyKeyField',
    '{',
    '  key ThirdAlias.AnyKeyField',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '    inner join I_ThirdEntity',
    '          (P_AnyParam        : a,',
    '          P_FourthParameter : bb)',
    '          as ThirdAlias',
    '      on OtherAlias.AnyKeyField = ThirdAlias.AnyKeyField',
    '{',
    '  key ThirdAlias.AnyKeyField',
    '}',
  ].join('\n');
  assert.equal(alignDdlSourceParameters(source), expected);
});

test('aligns a single-token qualified path value (dotted identifiers tokenize as one word)', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '  (',
    '   P_AnyParam : $parameters.P_AnyParam,',
    '     P_OtherParam    :   bb',
    '  )',
    '  as OtherAlias',
    '{',
    '  key OtherAlias.AnyKeyField',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '  (',
    '   P_AnyParam   : $parameters.P_AnyParam,',
    '     P_OtherParam : bb',
    '  )',
    '  as OtherAlias',
    '{',
    '  key OtherAlias.AnyKeyField',
    '}',
  ].join('\n');
  assert.equal(alignDdlSourceParameters(source), expected);
});

test('cancels alignment entirely for the whole clause if any parameter value has more than one token', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '  (',
    '   P_AnyParam : a + b,',
    '     P_OtherParam    :   bb',
    '  )',
    '  as OtherAlias',
    '{',
    '  key OtherAlias.AnyKeyField',
    '}',
  ].join('\n');
  assert.equal(alignDdlSourceParameters(source), source);
});

test('does not align a single parameter (no run of at least two)', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity( P_AnyParam : a )',
    '  as OtherAlias',
    '{',
    '  key OtherAlias.AnyKeyField',
    '}',
  ].join('\n');
  assert.equal(alignDdlSourceParameters(source), source);
});

test('does not align parameters crammed onto the same source line as each other', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity( P_AnyParam : a, P_OtherParam : bb )',
    '  as OtherAlias',
    '{',
    '  key OtherAlias.AnyKeyField',
    '}',
  ].join('\n');
  assert.equal(alignDdlSourceParameters(source), source);
});

test('does not move the opening parenthesis or the AS alias (deferred, out of scope)', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity(',
    '   P_AnyParam : a,',
    '   P_OtherParam : bb )   as OtherAlias',
    '{',
    '  key OtherAlias.AnyKeyField',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity(',
    '   P_AnyParam   : a,',
    '   P_OtherParam : bb )   as OtherAlias',
    '{',
    '  key OtherAlias.AnyKeyField',
    '}',
  ].join('\n');
  assert.equal(alignDdlSourceParameters(source), expected);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'define view entity I_AnyEntity',
    '  as select from I_OtherEntity',
    '  (',
    '   P_AnyParam : a,',
    '     P_OtherParam    :   bb',
    '  )',
    '  as OtherAlias',
    '{',
    '  key OtherAlias.AnyKeyField',
    '}',
  ].join('\n');
  const once = alignDdlSourceParameters(source);
  const twice = alignDdlSourceParameters(once);
  assert.equal(twice, once);
});
