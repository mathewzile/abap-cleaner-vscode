import assert from 'node:assert/strict';
import test from 'node:test';

import { breakBeforeWithIndent, capBlankLinesBefore, condensePhrase, ensureAtLeastOneBlankLineBefore, nextCodeIndex, nextCodeWordIs } from '../src/rules/ddl/position-helpers.js';
import { tokenize } from '../src/parser/tokenizer.js';

function applyEdits(sourceText: string, edits: readonly { readonly start: number; readonly end: number; readonly text: string }[]): string {
  return edits.reduceRight((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

test('breakBeforeWithIndent inserts a line break with the given indent before an attached token', () => {
  const source = 'as select from I_Any where field = 1';
  const tokens = tokenize(source, 'DDL');
  const whereIndex = tokens.findIndex((token) => token.text === 'where');
  const edits = breakBeforeWithIndent(tokens, whereIndex, 2);
  assert.equal(applyEdits(source, edits), 'as select from I_Any\n  where field = 1');
});

test('breakBeforeWithIndent normalizes existing indentation without touching blank lines above', () => {
  const source = 'as select from I_Any\n\n    where field = 1';
  const tokens = tokenize(source, 'DDL');
  const whereIndex = tokens.findIndex((token) => token.text === 'where');
  const edits = breakBeforeWithIndent(tokens, whereIndex, 2);
  assert.equal(applyEdits(source, edits), 'as select from I_Any\n\n  where field = 1');
});

test('breakBeforeWithIndent is a no-op when the indent already matches', () => {
  const source = 'as select from I_Any\n  where field = 1';
  const tokens = tokenize(source, 'DDL');
  const whereIndex = tokens.findIndex((token) => token.text === 'where');
  assert.deepEqual(breakBeforeWithIndent(tokens, whereIndex, 2), []);
});

test('condensePhrase joins a two-word phrase split across lines onto one line with a single space', () => {
  const source = 'group\n  by field';
  const tokens = tokenize(source, 'DDL');
  const groupIndex = tokens.findIndex((token) => token.text === 'group');
  const byIndex = tokens.findIndex((token) => token.text === 'by');
  const edits = condensePhrase(tokens, groupIndex, byIndex);
  assert.equal(applyEdits(source, edits), 'group by field');
});

test('ensureAtLeastOneBlankLineBefore adds a blank line only when a break already exists', () => {
  const attached = tokenize('a\nb', 'DDL');
  const bIndexAttached = attached.findIndex((token) => token.text === 'b');
  assert.equal(applyEdits('a\nb', ensureAtLeastOneBlankLineBefore(attached, bIndexAttached)), 'a\n\nb');

  const sameLine = tokenize('a b', 'DDL');
  const bIndexSameLine = sameLine.findIndex((token) => token.text === 'b');
  assert.deepEqual(ensureAtLeastOneBlankLineBefore(sameLine, bIndexSameLine), []);
});

test('capBlankLinesBefore caps consecutive blank lines without touching a single line break', () => {
  const source = 'a\n\n\nb';
  const tokens = tokenize(source, 'DDL');
  const bIndex = tokens.findIndex((token) => token.text === 'b');
  assert.equal(applyEdits(source, capBlankLinesBefore(tokens, bIndex, 0)), 'a\nb');
  const singleBreak = tokenize('a\nb', 'DDL');
  assert.deepEqual(capBlankLinesBefore(singleBreak, singleBreak.findIndex((token) => token.text === 'b'), 0), []);
});

test('nextCodeIndex and nextCodeWordIs skip whitespace to find the next code token', () => {
  const source = 'group   by field';
  const tokens = tokenize(source, 'DDL');
  const groupIndex = tokens.findIndex((token) => token.text === 'group');
  const byIndex = nextCodeIndex(tokens, groupIndex);
  assert.equal(byIndex === undefined ? undefined : tokens[byIndex]!.text, 'by');
  assert.equal(nextCodeWordIs(tokens, groupIndex, 'BY'), true);
  assert.equal(nextCodeWordIs(tokens, groupIndex, 'HAVING'), false);
});
