import assert from 'node:assert/strict';
import test from 'node:test';

import { alignColumnsLeftAligned } from '../src/rules/syntax/align-helpers.js';
import { tokenize } from '../src/parser/tokenizer.js';

function codeTokenRows(source: string): readonly (readonly ReturnType<typeof tokenize>[number][])[] {
  const tokens = tokenize(source, 'ABAP').filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
  const rows: (typeof tokens)[number][][] = [[]];
  for (const token of tokens) {
    rows.at(-1)!.push(token);
    if (token.text === '.') rows.push([]);
  }
  if (rows.at(-1)!.length === 0) rows.pop();
  return rows;
}

function applyEdits(sourceText: string, edits: readonly { readonly start: number; readonly end: number; readonly text: string }[]): string {
  return edits.reduceRight((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

test('pads each column to the widest cell in that column, across a two-column run', () => {
  const source = 'a bb.\nccc d.';
  const rows = codeTokenRows(source).map((row) => row.slice(0, 2));
  const edits = alignColumnsLeftAligned(rows);
  assert.equal(applyEdits(source, edits), 'a   bb.\nccc d.');
});

test('aligns a four-column run, matching the ALIGN_ALIASES_FOR column shape', () => {
  const source = 'ALIASES x FOR y.\nALIASES longer_name FOR z.';
  const rows = codeTokenRows(source).map((row) => row.slice(0, 4));
  const edits = alignColumnsLeftAligned(rows);
  assert.equal(applyEdits(source, edits), 'ALIASES x           FOR y.\nALIASES longer_name FOR z.');
});

test('is a no-op for fewer than two rows', () => {
  const rows = codeTokenRows('a bb.').map((row) => row.slice(0, 2));
  assert.deepEqual(alignColumnsLeftAligned(rows), []);
});

test('refuses rows of unequal column count rather than misaligning them', () => {
  const rows = [codeTokenRows('a bb.')[0]!.slice(0, 2), codeTokenRows('ccc d e.')[0]!.slice(0, 3)];
  assert.deepEqual(alignColumnsLeftAligned(rows), []);
});
