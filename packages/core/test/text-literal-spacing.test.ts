import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeTextLiteralSpacing } from '../src/index.js';

test('separates text literals from keywords and operators', () => {
  const source = "DATA value TYPE string VALUE`abc`.\nvalue=`abc`&&`def`.\nvalue=:'abc','def'.\nvalue ='abc'\"comment";
  const expected = "DATA value TYPE string VALUE `abc`.\nvalue= `abc`&& `def`.\nvalue=: 'abc', 'def'.\nvalue = 'abc' \"comment";

  assert.equal(normalizeTextLiteralSpacing(source), expected);
});

test('respects text literal spacing options', () => {
  assert.equal(normalizeTextLiteralSpacing("VALUE`abc`", { separateFromKeywords: false }), "VALUE`abc`");
  assert.equal(normalizeTextLiteralSpacing("value =`abc`", { separateFromOperators: false }), "value =`abc`");
  assert.equal(normalizeTextLiteralSpacing("value = 'abc'\"comment", { separateFromComments: false }), "value = 'abc'\"comment");
});

test('does not alter dynamic component access or SQL typed literals', () => {
  const source = "CALL METHOD lo_instance->('METHOD_NAME').\nUPDATE tab SET int1 = int1`255`.";

  assert.equal(normalizeTextLiteralSpacing(source), source);
});
