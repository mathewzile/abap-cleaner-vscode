import assert from 'node:assert/strict';
import test from 'node:test';
import { shortenSimpleValueStatements } from '../src/rules/syntax/value-statement.js';

test('factors one shared scalar assignment from two simple VALUE rows', () => {
  assert.equal(
    shortenSimpleValueStatements("lt_items = VALUE #( ( category = 'A' id = 1 ) ( category = 'A' id = 2 ) )."),
    "lt_items = VALUE #( category = 'A' ( id = 1 ) ( id = 2 ) ).",
  );
});

test('leaves multiline, commented, and nonidentical VALUE rows unchanged', () => {
  assert.equal(shortenSimpleValueStatements("lt_items = VALUE #( ( category = 'A' id = 1 ) ( category = 'B' id = 2 ) )."), "lt_items = VALUE #( ( category = 'A' id = 1 ) ( category = 'B' id = 2 ) ).");
  assert.equal(shortenSimpleValueStatements("lt_items = VALUE #( ( category = 'A' id = 1 ) ( category = 'A' id = 2 ) ). \" keep"), "lt_items = VALUE #( ( category = 'A' id = 1 ) ( category = 'A' id = 2 ) ). \" keep");
  assert.equal(shortenSimpleValueStatements("lt_items = VALUE #( ( category = 'A'\n  id = 1 ) ( category = 'A' id = 2 ) )."), "lt_items = VALUE #( ( category = 'A'\n  id = 1 ) ( category = 'A' id = 2 ) ).");
});