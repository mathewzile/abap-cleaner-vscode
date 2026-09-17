import assert from 'node:assert/strict';
import test from 'node:test';

import { removeSimpleCallMethod } from '../src/index.js';

test('removes CALL METHOD from simple static calls with parentheses', () => {
  assert.equal(removeSimpleCallMethod('CALL METHOD run( iv_id = id ).'), 'run( iv_id = id ).');
  assert.equal(removeSimpleCallMethod('CALL METHOD run( iv_id = resolve( id ) ).'), 'run( iv_id = resolve( id ) ).');
  assert.equal(removeSimpleCallMethod('CALL METHOD lo_ref->run( iv_id = id ).'), 'lo_ref->run( iv_id = id ).');
  assert.equal(removeSimpleCallMethod('CALL METHOD zcl_example=>run( iv_id = id ).'), 'zcl_example=>run( iv_id = id ).');
});

test('adds empty parentheses to simple static zero-argument calls', () => {
  assert.equal(removeSimpleCallMethod('CALL METHOD run.'), 'run().');
  assert.equal(removeSimpleCallMethod('CALL METHOD lo_ref->run.'), 'lo_ref->run().');
  assert.equal(removeSimpleCallMethod('CALL METHOD run EXPORTING id = value.'), 'run( id = value ).');
});

test('keeps calls without parentheses, dynamic targets, and multiline calls', () => {
  assert.equal(removeSimpleCallMethod('CALL METHOD run EXPORTING first = one second = two.'), 'CALL METHOD run EXPORTING first = one second = two.');
  assert.equal(removeSimpleCallMethod('CALL METHOD lo_ref->(method_name)( iv_id = id ).'), 'CALL METHOD lo_ref->(method_name)( iv_id = id ).');
  assert.equal(removeSimpleCallMethod('CALL METHOD run(\n  iv_id = id ).'), 'CALL METHOD run(\n  iv_id = id ).');
});