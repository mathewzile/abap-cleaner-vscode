import assert from 'node:assert/strict';
import test from 'node:test';

import { removeStandaloneEmptyCommands } from '../src/index.js';

test('removes punctuation-only empty-command lines', () => {
  assert.equal(removeStandaloneEmptyCommands('value = 1.\n .:,.\nvalue = 2.'), 'value = 1.\n\nvalue = 2.');
  assert.equal(removeStandaloneEmptyCommands('DATA value TYPE i.\n...\n'), 'DATA value TYPE i.\n\n');
});

test('retains comments and statements', () => {
  assert.equal(removeStandaloneEmptyCommands('. " keep this comment'), ' " keep this comment');
  assert.equal(removeStandaloneEmptyCommands('* full-line comment'), '* full-line comment');
  assert.equal(removeStandaloneEmptyCommands('DATA value TYPE i...'), 'DATA value TYPE i...');
});