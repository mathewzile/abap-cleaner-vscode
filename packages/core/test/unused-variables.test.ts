import assert from 'node:assert/strict';
import test from 'node:test';

import { removeUnusedDeclaredVariables } from '../src/index.js';

test('deletes a declared scalar variable never referenced again in its method', () => {
  const source = [
    'METHOD do_something.',
    'DATA lv_unused TYPE i.',
    'DATA lv_used TYPE i.',
    'lv_used = 1.',
    'ENDMETHOD.',
  ].join('\n');
  const expected = [
    'METHOD do_something.',
    '',
    'DATA lv_used TYPE i.',
    'lv_used = 1.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(removeUnusedDeclaredVariables(source), expected);
});

test('keeps a variable referenced only in a comment, chains, structures, and cross-method same-named variables', () => {
  const commentedOut = [
    'METHOD do_something.',
    'DATA lv_maybe_used TYPE i.',
    '* lv_maybe_used = 1.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(removeUnusedDeclaredVariables(commentedOut), commentedOut);

  const chain = [
    'METHOD do_something.',
    'DATA: lv_a TYPE i, lv_b TYPE i.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(removeUnusedDeclaredVariables(chain), chain);

  const crossMethod = [
    'METHOD first.',
    'DATA lv_x TYPE i.',
    'ENDMETHOD.',
    'METHOD second.',
    'DATA lv_x TYPE i.',
    'lv_x = 1.',
    'ENDMETHOD.',
  ].join('\n');
  const expectedCrossMethod = [
    'METHOD first.',
    '',
    'ENDMETHOD.',
    'METHOD second.',
    'DATA lv_x TYPE i.',
    'lv_x = 1.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(removeUnusedDeclaredVariables(crossMethod), expectedCrossMethod);
});

test('skips the whole method when it contains a dynamic ASSIGN', () => {
  const source = [
    'METHOD do_something.',
    'DATA lv_unused TYPE i.',
    'ASSIGN (lv_dynamic_name) TO <fs>.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(removeUnusedDeclaredVariables(source), source);
});
