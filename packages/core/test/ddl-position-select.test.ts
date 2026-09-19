import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDdlPositionSelect } from '../src/rules/ddl/position-select.js';

test('breaks before AS SELECT FROM at indent 2 and condenses the phrase onto one line', () => {
  assert.equal(
    normalizeDdlPositionSelect('define view entity C_Any as select\nfrom I_Any as A'),
    'define view entity C_Any\n  as select from I_Any as A',
  );
});

test('keeps DISTINCT in the condensed AS SELECT DISTINCT FROM phrase', () => {
  assert.equal(
    normalizeDdlPositionSelect('define view entity C_Any as select distinct\nfrom I_Any as A'),
    'define view entity C_Any\n  as select distinct from I_Any as A',
  );
});

test('breaks before AS PROJECTION ON at indent 2 and condenses the phrase onto one line', () => {
  assert.equal(
    normalizeDdlPositionSelect('define view entity C_Any as projection\non I_Any'),
    'define view entity C_Any\n  as projection on I_Any',
  );
});

test('breaks before SELECT FROM after UNION ALL at indent 2 and condenses the phrase', () => {
  assert.equal(
    normalizeDdlPositionSelect('union all select\nfrom I_Other'),
    'union all\n  select from I_Other',
  );
});

test('leaves a data source or field alias AS untouched', () => {
  const source = 'as select from I_Any as AnyAlias { key AnyAlias.Id as AliasedId }';
  assert.equal(normalizeDdlPositionSelect(source), source);
});

test('leaves already-correct AS SELECT FROM layout unchanged', () => {
  const source = 'define view entity C_Any\n  as select from I_Any as A';
  assert.equal(normalizeDdlPositionSelect(source), source);
});
