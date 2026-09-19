import assert from 'node:assert/strict';
import test from 'node:test';

import { alignDdlEntityParameters } from '../src/rules/ddl/align-entity-parameters.js';

test('enforces indent 4 and aligns the name/colon/type columns of a simple parameter list', () => {
  const source = [
    'define view entity C_Any',
    '  with parameters',
    '  P_Any : abap.cuky,',
    '  P_Longer : abap.cuky',
    '  as select from I_Other {',
    '  key Id',
    '}',
  ].join('\n');
  const expected = [
    'define view entity C_Any',
    '  with parameters',
    '    P_Any    : abap.cuky,',
    '    P_Longer : abap.cuky',
    '  as select from I_Other {',
    '  key Id',
    '}',
  ].join('\n');
  assert.equal(alignDdlEntityParameters(source), expected);
});

test('leaves an annotation line above a parameter untouched while still aligning the parameter itself', () => {
  const source = [
    'define view entity C_Any',
    '  with parameters',
    '    @Anno: 30',
    '    P_Any : abap.cuky,',
    '    P_Longer : abap.cuky',
    '  as select from I_Other {',
    '  key Id',
    '}',
  ].join('\n');
  const expected = [
    'define view entity C_Any',
    '  with parameters',
    '    @Anno: 30',
    '    P_Any    : abap.cuky,',
    '    P_Longer : abap.cuky',
    '  as select from I_Other {',
    '  key Id',
    '}',
  ].join('\n');
  assert.equal(alignDdlEntityParameters(source), expected);
});

test('cancels the whole alignment (all-or-nothing) when any parameter has a complex, multi-token type', () => {
  const source = [
    'define view entity C_Any',
    '  with parameters',
    '    P_Any : abap.char( 10 ),',
    '    P_Longer : abap.cuky',
    '  as select from I_Other {',
    '  key Id',
    '}',
  ].join('\n');
  assert.equal(alignDdlEntityParameters(source), source);
});

test('is a no-op when there is no WITH PARAMETERS clause', () => {
  const source = 'define view entity C_Any as select from I_Other {\n  key Id\n}';
  assert.equal(alignDdlEntityParameters(source), source);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'define view entity C_Any',
    '  with parameters',
    '  P_Any : abap.cuky,',
    '  P_Longer : abap.cuky',
    '  as select from I_Other {',
    '  key Id',
    '}',
  ].join('\n');
  const once = alignDdlEntityParameters(source);
  const twice = alignDdlEntityParameters(once);
  assert.equal(twice, once);
});
