import assert from 'node:assert/strict';
import test from 'node:test';

import { moveIsolatedClosingBracketsToPreviousLine } from '../src/index.js';

test('moves an isolated closing bracket and period to the preceding code line', () => {
  assert.equal(moveIsolatedClosingBracketsToPreviousLine('any_method(\n  iv_value = value\n).'), 'any_method(\n  iv_value = value ).');
  assert.equal(moveIsolatedClosingBracketsToPreviousLine('value = items[\n  1\n].'), 'value = items[\n  1 ].');
  assert.equal(moveIsolatedClosingBracketsToPreviousLine('any_method(\n  nested( value\n  )\n  other = value\n).'), 'any_method(\n  nested( value )\n  other = value ).');
});

test('keeps closing brackets after blank or comment-bearing lines unchanged', () => {
  assert.equal(moveIsolatedClosingBracketsToPreviousLine('any_method(\n  iv_value = value " note\n).'), 'any_method(\n  iv_value = value " note\n).');
  assert.equal(moveIsolatedClosingBracketsToPreviousLine('any_method(\n\n).'), 'any_method(\n\n).');
});