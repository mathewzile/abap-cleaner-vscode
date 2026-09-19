import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDdlPositionClauses } from '../src/rules/ddl/position-clauses.js';

test('breaks before WHERE and HAVING with no indent when attached to the previous line', () => {
  assert.equal(normalizeDdlPositionClauses('key Id where Field = 1'), 'key Id\nwhere Field = 1');
  assert.equal(normalizeDdlPositionClauses('key Id group by Field having count( * ) > 1'), 'key Id\ngroup by Field\nhaving count( * ) > 1');
});

test('breaks before a two-word GROUP BY phrase and condenses it onto one line', () => {
  assert.equal(normalizeDdlPositionClauses('key Id\ngroup\n  by Field'), 'key Id\ngroup by Field');
});

test('breaks before UNION/INTERSECT/EXCEPT and condenses UNION ALL onto one line', () => {
  assert.equal(normalizeDdlPositionClauses('key Id union\n  all select from I_Other'), 'key Id\nunion all select from I_Other');
  assert.equal(normalizeDdlPositionClauses('key Id intersect select from I_Other'), 'key Id\nintersect select from I_Other');
  assert.equal(normalizeDdlPositionClauses('key Id except select from I_Other'), 'key Id\nexcept select from I_Other');
});

test('leaves already-correct clause breaks unchanged', () => {
  const source = 'key Id\nwhere Field = 1\ngroup by Field\nhaving count( * ) > 1';
  assert.equal(normalizeDdlPositionClauses(source), source);
});

test('does not treat a WHERE inside a nested subquery as a top-level clause', () => {
  const source = 'as select from I_Any as A { key A.Id, (select count(*) from I_Other where Id = A.Id) as Cnt }';
  assert.equal(normalizeDdlPositionClauses(source), source);
});
