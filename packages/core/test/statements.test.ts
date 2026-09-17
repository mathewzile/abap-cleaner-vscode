import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAbapStatements, selectAbapStatements } from '../src/index.js';

test('segments ABAP statements without splitting literals or comments', () => {
  const statements = parseAbapStatements("WRITE 'a.b'. \" comment\nWRITE `c.d`.");
  assert.deepEqual(statements.map((statement) => [statement.startLine, statement.endLine]), [[1, 1], [2, 2]]);
});

test('does not split an ABAP decimal literal into statements', () => {
  const statements = parseAbapStatements('WRITE 1.23. WRITE 4.56.');
  assert.deepEqual(statements.map((statement) => [statement.startLine, statement.endLine]), [[1, 1], [1, 1]]);
});

test('keeps a line-end comment with its statement', () => {
  const statements = parseAbapStatements('WRITE first. " comment\nWRITE second.');
  assert.equal(statements[0]?.tokens.at(-1)?.kind, 'comment');
  assert.deepEqual(statements.map((statement) => statement.rangeStartLine), [1, 2]);
});

test('selects statements intersecting a requested line range', () => {
  const sourceText = "WRITE 'first'.\nWRITE 'second'.\nWRITE 'third'.";
  const selected = selectAbapStatements(sourceText, 2, 2);
  assert.deepEqual(selected.map((statement) => [statement.startLine, statement.endLine]), [[2, 2]]);
});

test('selects a statement when its leading comment is selected', () => {
  const sourceText = '" note\nWRITE value .';
  const [statement] = selectAbapStatements(sourceText, 1, 1);
  assert.equal(statement?.rangeStartLine, 1);
  assert.equal(statement?.startLine, 2);
});
