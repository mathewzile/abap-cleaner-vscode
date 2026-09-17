import assert from 'node:assert/strict';
import test from 'node:test';

import { simplifyRaiseType } from '../src/index.js';

test('converts simple one-line RAISE EXCEPTION TYPE statements', () => {
  assert.equal(simplifyRaiseType('RAISE EXCEPTION TYPE cx_example.'), 'RAISE EXCEPTION NEW cx_example( ).');
  assert.equal(simplifyRaiseType('RAISE RESUMABLE EXCEPTION TYPE cx_example.'), 'RAISE RESUMABLE EXCEPTION NEW cx_example( ).');
  assert.equal(simplifyRaiseType('RAISE SHORTDUMP TYPE cx_example.'), 'RAISE SHORTDUMP NEW cx_example( ).');
  assert.equal(simplifyRaiseType('RAISE EXCEPTION TYPE cx_example EXPORTING textid = text.'), 'RAISE EXCEPTION NEW cx_example( textid = text ).');
  assert.equal(simplifyRaiseType('RAISE RESUMABLE EXCEPTION TYPE cx_example EXPORTING textid = text previous = cause.'), 'RAISE RESUMABLE EXCEPTION NEW cx_example( textid = text previous = cause ).');
  assert.equal(simplifyRaiseType("RAISE SHORTDUMP TYPE cx_example EXPORTING textid = 'text' text1 = text."), "RAISE SHORTDUMP NEW cx_example( textid = 'text' text1 = text ).");
});

test('keeps messages, complex parameter lists, and non-exception RAISE statements', () => {
  assert.equal(simplifyRaiseType('RAISE EXCEPTION TYPE cx_example USING MESSAGE.'), 'RAISE EXCEPTION TYPE cx_example USING MESSAGE.');
  assert.equal(simplifyRaiseType('RAISE EXCEPTION TYPE cx_example EXPORTING textid = get_text( ).'), 'RAISE EXCEPTION TYPE cx_example EXPORTING textid = get_text( ).');
  assert.equal(simplifyRaiseType('RAISE SHORTDUMP TYPE cx_example EXPORTING textid = text " keep'), 'RAISE SHORTDUMP TYPE cx_example EXPORTING textid = text " keep');
});