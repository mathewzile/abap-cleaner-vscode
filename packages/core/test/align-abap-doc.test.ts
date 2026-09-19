import assert from 'node:assert/strict';
import test from 'node:test';

import { alignAbapDoc } from '../src/rules/syntax/align-abap-doc.js';

test('aligns @parameter/@raising doc lines to the widest keyword and name in the run', () => {
  const source = [
    '"! @parameter iv_any | any parameter',
    '"! @parameter iv_other_param | other parameter',
    '"! @raising cx_any | any exception',
    'METHODS any_method.',
  ].join('\n');
  const expected = [
    '"! @parameter iv_any         | any parameter',
    '"! @parameter iv_other_param | other parameter',
    '"! @raising   cx_any         | any exception',
    'METHODS any_method.',
  ].join('\n');
  assert.equal(alignAbapDoc(source), expected);
});

test('does not align a run with only one parameter doc line', () => {
  const source = [
    '"! @parameter iv_any | any parameter',
    'METHODS any_method.',
  ].join('\n');
  assert.equal(alignAbapDoc(source), source);
});

test('does not align a run followed by another (non-doc) comment instead of real code', () => {
  const source = [
    '"! @parameter iv_any | any parameter',
    '"! @parameter iv_other_param | other parameter',
    '* a regular comment, not the declaration',
    'METHODS any_method.',
  ].join('\n');
  assert.equal(alignAbapDoc(source), source);
});

test('a plain (non-parameter) doc line inside the run neither breaks it nor gets rewritten', () => {
  const source = [
    '"! <p>Any method description</p>',
    '"!',
    '"! @parameter iv_any | any parameter',
    '"! @parameter iv_other_param | other parameter',
    'METHODS any_method.',
  ].join('\n');
  const expected = [
    '"! <p>Any method description</p>',
    '"!',
    '"! @parameter iv_any         | any parameter',
    '"! @parameter iv_other_param | other parameter',
    'METHODS any_method.',
  ].join('\n');
  assert.equal(alignAbapDoc(source), expected);
});

test('is idempotent: running twice on already-aligned doc lines makes no further change', () => {
  const source = [
    '"! @parameter iv_any | any parameter',
    '"! @parameter iv_other_param | other parameter',
    'METHODS any_method.',
  ].join('\n');
  const once = alignAbapDoc(source);
  const twice = alignAbapDoc(once);
  assert.equal(twice, once);
});
