import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeEmptyBracketSpacing } from '../src/index.js';

test('condenses only excess same-line whitespace in empty brackets', () => {
  const source = "any_method(    ).\nvalue = VALUE #(     ).\ntext = '[    ]'. \" (    )";
  const expected = "any_method( ).\nvalue = VALUE #( ).\ntext = '[    ]'. \" (    )";

  assert.equal(normalizeEmptyBracketSpacing(source), expected);
});

test('keeps empty bracket whitespace when disabled or across lines', () => {
  assert.equal(normalizeEmptyBracketSpacing('any_method(    )', { processEmptyBrackets: false }), 'any_method(    )');
  assert.equal(normalizeEmptyBracketSpacing('any_method(\n    )'), 'any_method(\n    )');
});
