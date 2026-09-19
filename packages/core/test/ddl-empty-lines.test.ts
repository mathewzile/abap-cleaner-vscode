import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDdlEmptyLines } from '../src/rules/ddl/empty-lines.js';

test('collapses more than one consecutive blank line to a single blank line', () => {
  const source = 'define view entity C_Any\n\n\n\nas select from I_Any\n{\n  key id\n}';
  const expected = 'define view entity C_Any\n\nas select from I_Any\n{\n  key id\n}';
  assert.equal(normalizeDdlEmptyLines(source), expected);
});

test('keeps a single blank line untouched', () => {
  const source = 'define view entity C_Any\n\nas select from I_Any\n{\n  key id\n}';
  assert.equal(normalizeDdlEmptyLines(source), source);
});

test('trims trailing blank lines at document end', () => {
  const source = 'define view entity C_Any as select from I_Any {\n  key id\n}\n\n\n';
  const expected = 'define view entity C_Any as select from I_Any {\n  key id\n}\n';
  assert.equal(normalizeDdlEmptyLines(source), expected);
});

test('does not touch blank lines inside a block comment', () => {
  const source = 'define view entity C_Any /* line one\n\n\nline two */ as select from I_Any {\n  key id\n}';
  assert.equal(normalizeDdlEmptyLines(source), source);
});
