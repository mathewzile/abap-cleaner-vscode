import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDdlPositionJoin, normalizeDdlPositionAssociation } from '../src/rules/ddl/position-join-association.js';

test('JOIN: breaks before the keyword phrase at indent 4 and condenses it onto one line', () => {
  assert.equal(
    normalizeDdlPositionJoin('as select from I_Any as A left outer to one\njoin I_Other as B on A.Id = B.Id'),
    'as select from I_Any as A\n    left outer to one join I_Other as B on A.Id = B.Id',
  );
});

test('JOIN: forces a break before ON at indent 6 when some JOIN in the file already has a multi-line condition, and indents every JOIN line to column 4', () => {
  const source = 'join I_First as F on A.Id = F.Id\n\njoin I_Second as S on A.Id = S.Id\n  and A.Sub = S.Sub';
  const expected = 'join I_First as F\n      on A.Id = F.Id\n\n    join I_Second as S\n      on A.Id = S.Id\n  and A.Sub = S.Sub';
  assert.equal(normalizeDdlPositionJoin(source), expected);
});

test('JOIN: leaves the ON condition alone (neither forcing nor removing a break) when no JOIN in the file has a multi-line condition', () => {
  const source = 'join I_First as F on A.Id = F.Id\n\njoin I_Second as S on A.Id = S.Id';
  const expected = 'join I_First as F on A.Id = F.Id\n\n    join I_Second as S on A.Id = S.Id';
  assert.equal(normalizeDdlPositionJoin(source), expected);
});

test('JOIN: does not touch an ASSOCIATION start', () => {
  const source = 'association [0..1] to I_Other as _Other on A.Id = _Other.Id';
  assert.equal(normalizeDdlPositionJoin(source), source);
});

test('ASSOCIATION: breaks before the keyword phrase (with cardinality bracket) at indent 2 and condenses it', () => {
  assert.equal(
    normalizeDdlPositionAssociation('as select from I_Any as A association [0..1]\nto I_Other as _Other on A.Id = _Other.Id'),
    'as select from I_Any as A\n  association [0..1] to I_Other as _Other on A.Id = _Other.Id',
  );
});

test('ASSOCIATION: forces a break before ON at indent 4 when some ASSOCIATION in the file already has a multi-line condition, and indents every ASSOCIATION line to column 2', () => {
  const source = 'association [0..1] to I_First as _First on A.Id = _First.Id\n\nassociation [0..1] to I_Second as _Second on A.Id = _Second.Id\n  and A.Sub = _Second.Sub';
  const expected = 'association [0..1] to I_First as _First\n    on A.Id = _First.Id\n\n  association [0..1] to I_Second as _Second\n    on A.Id = _Second.Id\n  and A.Sub = _Second.Sub';
  assert.equal(normalizeDdlPositionAssociation(source), expected);
});

test('ASSOCIATION: does not touch a JOIN start', () => {
  const source = 'join I_Other as B on A.Id = B.Id';
  assert.equal(normalizeDdlPositionAssociation(source), source);
});

test('leaves already-correct layout unchanged (idempotence)', () => {
  const source = 'join I_First as F\n      on A.Id = F.Id\n\n    join I_Second as S\n      on A.Id = S.Id\n  and A.Sub = S.Sub';
  assert.equal(normalizeDdlPositionJoin(source), source);
});
