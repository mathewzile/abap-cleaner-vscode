import assert from 'node:assert/strict';
import test from 'node:test';

import { removeOptionalExporting } from '../src/index.js';

test('removes optional EXPORTING from a simple one-line method call', () => {
  assert.equal(removeOptionalExporting('result = get_value( EXPORTING iv_id = id ).'), 'result = get_value( iv_id = id ).');
  assert.equal(removeOptionalExporting('result = get_value( EXPORTING iv_id = resolve( id ) ).'), 'result = get_value( iv_id = resolve( id ) ).');
  assert.equal(removeOptionalExporting('result = get_value( EXPORTING iv_id = resolve( EXPORTING key = id ) ).'), 'result = get_value( iv_id = resolve( key = id ) ).');
});

test('keeps EXPORTING in declarations, mixed sections, and multiline calls', () => {
  assert.equal(removeOptionalExporting('METHODS run IMPORTING exporting TYPE string.'), 'METHODS run IMPORTING exporting TYPE string.');
  assert.equal(removeOptionalExporting('run( EXPORTING iv_id = id IMPORTING ev_value = value ).'), 'run( EXPORTING iv_id = id IMPORTING ev_value = value ).');
  assert.equal(removeOptionalExporting('run(\n  EXPORTING iv_id = id ).'), 'run(\n  EXPORTING iv_id = id ).');
});