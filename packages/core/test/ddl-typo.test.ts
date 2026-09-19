import assert from 'node:assert/strict';
import test from 'node:test';

import { correctDdlCommentTypos } from '../src/rules/ddl/typo.js';

test('corrects an embedded unambiguous typo inside a // line-end comment, preserving case', () => {
  assert.equal(correctDdlCommentTypos('// Name and attibutes\nkey Doc.Id,'), '// Name and attributes\nkey Doc.Id,');
});

test('corrects a known typo inside a -- comment and a /* */ block comment', () => {
  assert.equal(correctDdlCommentTypos('-- assigment allready done'), '-- assignment already done');
  assert.equal(correctDdlCommentTypos('/* alowed asterics */'), '/* allowed asterisk */');
});

test('leaves non-comment tokens and unknown words unchanged', () => {
  const source = "@EndUserText.label: 'main dcoument imformation'\nkey Doc.Id,";
  assert.equal(correctDdlCommentTypos(source), source);
});
