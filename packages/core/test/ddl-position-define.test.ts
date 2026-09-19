import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDdlPositionDefine } from '../src/rules/ddl/position-define.js';

test('condenses a DEFINE VIEW ENTITY phrase split across lines onto one line', () => {
  assert.equal(
    normalizeDdlPositionDefine('define\n   view\nentity C_Any as select from I_Other {'),
    'define view entity C_Any as select from I_Other {',
  );
});

test('condenses an EXTEND VIEW ENTITY phrase and leaves the entity name untouched', () => {
  assert.equal(
    normalizeDdlPositionDefine('extend view\n  entity C_Any {'),
    'extend view entity C_Any {',
  );
});

test('breaks before WITH PARAMETERS at indent 2 and condenses the phrase onto one line', () => {
  assert.equal(
    normalizeDdlPositionDefine('define view entity C_Any with\nparameters\nP_Any : abap.cuky as select from I_Other {'),
    'define view entity C_Any\n  with parameters\nP_Any : abap.cuky as select from I_Other {',
  );
});

test('leaves an ordinary WITH DEFAULT FILTER untouched', () => {
  const source = 'define view entity C_Any as select from I_Other association [0..1] to I_Other as _Other on 1 = 1 with default filter { key Id }';
  assert.equal(normalizeDdlPositionDefine(source), source);
});

test('leaves already-correct layout unchanged', () => {
  const source = 'define view entity C_Any\n  with parameters P_Any : abap.cuky\n  as select from I_Other {';
  assert.equal(normalizeDdlPositionDefine(source), source);
});
