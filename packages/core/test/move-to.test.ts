import assert from 'node:assert/strict';
import test from 'node:test';

import { simplifyMoveTo } from '../src/index.js';

test('converts simple single-line MOVE TO statements', () => {
  assert.equal(simplifyMoveTo('MOVE value TO result.'), 'result = value.');
  assert.equal(simplifyMoveTo("MOVE 'text' TO result."), "result = 'text'.");
});

test('keeps complex, cast, chained, and component MOVE statements', () => {
  assert.equal(simplifyMoveTo('MOVE EXACT value TO result.'), 'MOVE EXACT value TO result.');
  assert.equal(simplifyMoveTo('MOVE source ?TO result.'), 'MOVE source ?TO result.');
  assert.equal(simplifyMoveTo('MOVE value TO: first, second.'), 'MOVE value TO: first, second.');
  assert.equal(simplifyMoveTo('MOVE value TO structure-component.'), 'MOVE value TO structure-component.');
});