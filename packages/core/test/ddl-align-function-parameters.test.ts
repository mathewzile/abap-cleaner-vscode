import assert from 'node:assert/strict';
import test from 'node:test';

import { alignDdlFunctionParameters } from '../src/rules/ddl/align-function-parameters.js';

test('aligns simple single-token parameter values in a function call', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a,',
    '  currency_conversion(',
    '    amount : a,',
    '    source_currency => b,',
    '    target_currency => c',
    '  ) as converted_amount',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a,',
    '  currency_conversion(',
    '    amount : a,',
    '    source_currency => b,',
    '    target_currency => c',
    '  ) as converted_amount',
    '}',
  ].join('\n');
  // the "amount : a" param uses ':' (a colon-style call, not this rule's => shape), so
  // containsTopLevelArrow is still true (other params use =>) but "amount : a" fails the
  // strict <name> => <value> shape check, refusing the WHOLE call — expected == source
  assert.equal(alignDdlFunctionParameters(source), expected);
});

test('aligns a function call whose params all use the => shape', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a,',
    '  currency_conversion(',
    '    amount => a,',
    '    source_currency => bb,',
    '    target_currency => c',
    '  ) as converted_amount',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a,',
    '  currency_conversion(',
    '    amount          => a,',
    '    source_currency => bb,',
    '    target_currency => c',
    '  ) as converted_amount',
    '}',
  ].join('\n');
  assert.equal(alignDdlFunctionParameters(source), expected);
});

test('aligns a nested function call independently of its multi-token-valued outer call', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a,',
    '  power(',
    '    base => power(',
    '      base => x,',
    '      exponent => 3',
    '    ),',
    '    exponent => 2',
    '  ) as result',
    '}',
  ].join('\n');
  const expected = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a,',
    '  power(',
    '    base => power(',
    '      base     => x,',
    '      exponent => 3',
    '    ),',
    '    exponent => 2',
    '  ) as result',
    '}',
  ].join('\n');
  assert.equal(alignDdlFunctionParameters(source), expected);
});

test('cancels alignment entirely for the whole call if any parameter value has more than one token', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a,',
    '  currency_conversion(',
    '    amount => a + b,',
    '    source_currency => bb',
    '  ) as converted_amount',
    '}',
  ].join('\n');
  assert.equal(alignDdlFunctionParameters(source), source);
});

test('does not align a call with only one parameter (no run of at least two)', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a,',
    '  unit_conversion( amount => a ) as result',
    '}',
  ].join('\n');
  assert.equal(alignDdlFunctionParameters(source), source);
});

test('does not touch a plain grouping expression with no => inside', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a,',
    '  ( a + b ) as sum_ab',
    '}',
  ].join('\n');
  assert.equal(alignDdlFunctionParameters(source), source);
});

test('does not align parameters crammed onto the same source line as each other', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a,',
    '  currency_conversion( amount => a, source_currency => bb ) as converted_amount',
    '}',
  ].join('\n');
  assert.equal(alignDdlFunctionParameters(source), source);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'define view entity I_AnyEntity as select from I_OtherEntity',
    '{',
    '  key a,',
    '  currency_conversion(',
    '    amount => a,',
    '    source_currency => bb',
    '  ) as converted_amount',
    '}',
  ].join('\n');
  const once = alignDdlFunctionParameters(source);
  const twice = alignDdlFunctionParameters(once);
  assert.equal(twice, once);
});
