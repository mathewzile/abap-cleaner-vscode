import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDdlEmptyLinesBetween } from '../src/rules/ddl/empty-lines-between.js';

test('ensures at least one blank line between the select-list braces and their neighbors, without creating a break', () => {
  assert.equal(
    normalizeDdlEmptyLinesBetween('as select from I_Any\n{\nkey Id\n}\nwhere Id = 1'),
    'as select from I_Any\n\n{\nkey Id\n}\n\nwhere Id = 1',
  );
});

test('does not add a blank line before a brace that is still attached to the previous line', () => {
  const source = 'as select from I_Any {\nkey Id\n}';
  assert.equal(normalizeDdlEmptyLinesBetween(source), source);
});

test('caps blank lines to zero directly after the opening brace and directly before the closing brace', () => {
  assert.equal(
    normalizeDdlEmptyLinesBetween('as select from I_Any\n\n{\n\nkey Id\n\n}'),
    'as select from I_Any\n\n{\nkey Id\n}',
  );
});

test('ensures at least one blank line between trailing annotations and the DEFINE keyword', () => {
  assert.equal(
    normalizeDdlEmptyLinesBetween("@EndUserText.label: 'x'\ndefine view entity C_Any"),
    "@EndUserText.label: 'x'\n\ndefine view entity C_Any",
  );
});

test('does not force a blank line before DEFINE when no annotation precedes it', () => {
  const source = 'define view entity C_Any as select from I_Any {\nkey Id\n}';
  assert.equal(normalizeDdlEmptyLinesBetween(source), source);
});

test('leaves already-correct spacing unchanged', () => {
  const source = "@EndUserText.label: 'x'\n\ndefine view entity C_Any as select from I_Any\n\n{\nkey Id\n}\n\nwhere Id = 1";
  assert.equal(normalizeDdlEmptyLinesBetween(source), source);
});
