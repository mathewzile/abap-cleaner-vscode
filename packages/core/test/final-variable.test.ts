import assert from 'node:assert/strict';
import test from 'node:test';

import { useFinalForImmutableInlineDeclarations } from '../src/index.js';

test('converts DATA( ) to FINAL( ) when the variable is read again but never reassigned', () => {
  const source = [
    'METHOD do_something.',
    'DATA(lv_date) = get_date( ).',
    'rv_result = lv_date.',
    'ENDMETHOD.',
  ].join('\n');
  const expected = [
    'METHOD do_something.',
    'FINAL(lv_date) = get_date( ).',
    'rv_result = lv_date.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(useFinalForImmutableInlineDeclarations(source), expected);
});

test('keeps DATA( ) when the variable is reassigned, never read again, or the method uses risky constructs', () => {
  const reassigned = [
    'METHOD do_something.',
    'DATA(lv_count) = 0.',
    'lv_count = lv_count + 1.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(useFinalForImmutableInlineDeclarations(reassigned), reassigned);

  const compoundReassigned = [
    'METHOD do_something.',
    'DATA(lv_count) = 0.',
    'lv_count += 1.',
    'rv_result = lv_count.',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(useFinalForImmutableInlineDeclarations(compoundReassigned), compoundReassigned);

  const neverReadAgain = [
    'METHOD do_something.',
    'DATA(lv_unused) = get_date( ).',
    'ENDMETHOD.',
  ].join('\n');
  assert.equal(useFinalForImmutableInlineDeclarations(neverReadAgain), neverReadAgain);

  const usesFieldSymbol = [
    'METHOD do_something.',
    'DATA(lt_table) = get_table( ).',
    'LOOP AT lt_table ASSIGNING FIELD-SYMBOL(<ls_row>).',
    '  <ls_row>-used = abap_true.',
    'ENDLOOP.',
  ].join('\n');
  assert.equal(useFinalForImmutableInlineDeclarations(usesFieldSymbol), usesFieldSymbol);
});
