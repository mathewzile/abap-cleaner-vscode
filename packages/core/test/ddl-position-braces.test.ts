import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDdlPositionBraces } from '../src/rules/ddl/position-braces.js';

test('inserts a line break with no indent before an opening brace attached to the previous line', () => {
  assert.equal(
    normalizeDdlPositionBraces('as select from I_Any as A {\nkey A.Id\n}'),
    'as select from I_Any as A\n{\nkey A.Id\n}',
  );
});

test('inserts a line break with no indent before a closing brace attached to the previous line', () => {
  assert.equal(
    normalizeDdlPositionBraces('{\nkey A.Id }'),
    '{\nkey A.Id\n}',
  );
});

test('strips leading indent from a brace that is already on its own line', () => {
  assert.equal(
    normalizeDdlPositionBraces('as select from I_Any as A\n  {\nkey A.Id\n}'),
    'as select from I_Any as A\n{\nkey A.Id\n}',
  );
});

test('leaves a brace at column 0 with a preserved blank line above it unchanged', () => {
  const source = 'as select from I_Any as A\n\n{\nkey A.Id\n}';
  assert.equal(normalizeDdlPositionBraces(source), source);
});

test('normalizes multiple top-level select-list brace pairs independently, e.g. across a UNION ALL', () => {
  const source = 'select from I_Any {\nkey A.Id }\n\nunion all\n\nselect from I_Other {\nkey B.Id }';
  const expected = 'select from I_Any\n{\nkey A.Id\n}\n\nunion all\n\nselect from I_Other\n{\nkey B.Id\n}';
  assert.equal(normalizeDdlPositionBraces(source), expected);
});

test('leaves a structured annotation value brace untouched', () => {
  const source = "@ObjectModel.usageType: { serviceQuality: #D }\nas select from I_Any as A {\nkey A.Id\n}";
  const expected = "@ObjectModel.usageType: { serviceQuality: #D }\nas select from I_Any as A\n{\nkey A.Id\n}";
  assert.equal(normalizeDdlPositionBraces(source), expected);
});
