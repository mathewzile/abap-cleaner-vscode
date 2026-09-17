import assert from 'node:assert/strict';
import test from 'node:test';

import { parseTopLevelNamedArguments, tokenize } from '../src/index.js';

test('parses top-level named arguments and preserves nested value boundaries', () => {
  const tokens = tokenize('method( first = value second = nested( item = key ) third = `text` )', 'ABAP');
  const openingIndex = tokens.findIndex((token) => token.text === '(');
  const arguments_ = parseTopLevelNamedArguments(tokens, openingIndex);

  assert.deepEqual(arguments_?.map(({ name, valueStartIndex, valueEndIndex }) => ({
    name,
    value: tokens.slice(valueStartIndex, valueEndIndex + 1).map((token) => token.text).join(''),
  })), [
    { name: 'first', value: 'value' },
    { name: 'second', value: 'nested( item = key )' },
    { name: 'third', value: '`text`' },
  ]);
});

test('rejects malformed and positional argument lists', () => {
  const malformed = tokenize('method( first value )', 'ABAP');
  const positional = tokenize('method( value )', 'ABAP');
  assert.equal(parseTopLevelNamedArguments(malformed, 1), undefined);
  assert.equal(parseTopLevelNamedArguments(positional, 1), undefined);
});