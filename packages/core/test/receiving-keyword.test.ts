import assert from 'node:assert/strict';
import test from 'node:test';

import { removeSimpleReceiving } from '../src/index.js';

test('converts a simple one-line call with only RECEIVING', () => {
  assert.equal(removeSimpleReceiving('get_value( RECEIVING result = value ).'), 'value = get_value( ).');
  assert.equal(removeSimpleReceiving('object->get_value( RECEIVING result = value ).'), 'value = object->get_value( ).');
  assert.equal(removeSimpleReceiving('class=>get_value( RECEIVING result = value ).'), 'value = class=>get_value( ).');
});

test('keeps mixed sections, expressions, and multiline calls', () => {
  assert.equal(removeSimpleReceiving('get_value( EXPORTING id = key RECEIVING result = value ).'), 'get_value( EXPORTING id = key RECEIVING result = value ).');
  assert.equal(removeSimpleReceiving('get_value( RECEIVING result = structure-component ).'), 'get_value( RECEIVING result = structure-component ).');
  assert.equal(removeSimpleReceiving('factory( )->get_value( RECEIVING result = value ).'), 'factory( )->get_value( RECEIVING result = value ).');
  assert.equal(removeSimpleReceiving('get_value(\n  RECEIVING result = value ).'), 'get_value(\n  RECEIVING result = value ).');
});