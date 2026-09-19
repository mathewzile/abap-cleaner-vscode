import assert from 'node:assert/strict';
import test from 'node:test';

import { tokenize, type Token } from '../src/parser/tokenizer.js';
import { alignColumnsLeftAligned, alignColumnsWithOptionalCells, type AlignSpan } from '../src/rules/syntax/align-helpers.js';

// Tokenizes the WHOLE source once and groups non-whitespace tokens by line, so every token's
// `.offset` stays correct relative to the combined multi-line source (tokenizing each line
// independently would reset offsets to 0 per line).
function rowsOf(sourceText: string): readonly (readonly Token[])[] {
  const tokens = tokenize(sourceText, 'ABAP').filter((token) => token.kind !== 'whitespace');
  const rows: Token[][] = [];
  for (const token of tokens) {
    const rowIndex = token.line - 1;
    rows[rowIndex] ??= [];
    rows[rowIndex]!.push(token);
  }
  return rows;
}

function span(token: Token): AlignSpan {
  return { first: token, last: token };
}

function apply(sourceText: string, edits: readonly { readonly start: number; readonly end: number; readonly text: string }[]): string {
  return [...edits]
    .sort((a, b) => b.start - a.start)
    .reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

test('matches alignColumnsLeftAligned byte-for-byte when no columns are missing anywhere', () => {
  const source = ['a bb ccc', 'dddd e ff'].join('\n');
  const rows = rowsOf(source);
  const simpleEdits = alignColumnsLeftAligned(rows);
  const optionalEdits = alignColumnsWithOptionalCells(rows.map((row) => row.map(span)));
  assert.equal(apply(source, optionalEdits), apply(source, simpleEdits));
});

test('accumulates a skipped middle column\'s width into the gap before the next present cell', () => {
  // 3 columns: col0, col1, col2. Row B skips col1.
  const source = ['ABC X Q', 'A     Z'].join('\n');
  const [rowA, rowB] = rowsOf(source);
  const rows: (AlignSpan | undefined)[][] = [
    [span(rowA![0]!), span(rowA![1]!), span(rowA![2]!)],
    [span(rowB![0]!), undefined, span(rowB![1]!)],
  ];
  const result = apply(source, alignColumnsWithOptionalCells(rows));
  const lines = result.split('\n');
  // col0 width = max("ABC","A") = 3, col1 width = max("X") = 1
  // row B: pad = (3 - 1 + 1) + (1 + 1) = 3 + 2 = 5 spaces between "A" and "Z"
  assert.equal(lines[1], 'A' + ' '.repeat(5) + 'Z');
});

test('refuses when any row is missing its first column (no well-defined leading-gap anchor)', () => {
  const source = ['key a x', '    b y'].join('\n');
  const [rowA, rowB] = rowsOf(source);
  const rows: (AlignSpan | undefined)[][] = [
    [span(rowA![0]!), span(rowA![1]!), span(rowA![2]!)],
    [undefined, span(rowB![0]!), span(rowB![1]!)],
  ];
  assert.deepEqual(alignColumnsWithOptionalCells(rows), []);
});

test('a column empty across every row contributes zero width, not width+1', () => {
  const source = ['a x', 'bb y'].join('\n');
  const [rowA, rowB] = rowsOf(source);
  // 3 logical columns, but the middle one is undefined for EVERY row
  const rows: (AlignSpan | undefined)[][] = [
    [span(rowA![0]!), undefined, span(rowA![1]!)],
    [span(rowB![0]!), undefined, span(rowB![1]!)],
  ];
  const result = apply(source, alignColumnsWithOptionalCells(rows));
  const lines = result.split('\n');
  // col0 width = max("a","bb") = 2; row A "a" pads to width 2 (1 extra space) regardless of the
  // always-empty middle column, which must contribute 0 extra, not a further 2+1
  assert.equal(lines[0], 'a' + '  ' + 'x');
  assert.equal(lines[1], 'bb' + ' ' + 'y');
});

test('a Term cell spanning multiple tokens is measured by its full rendered width', () => {
  const source = ['a bb x', 'c d e y'].join('\n');
  const [rowA, rowB] = rowsOf(source);
  const rows: (AlignSpan | undefined)[][] = [
    [{ first: rowA![0]!, last: rowA![1]! }, span(rowA![2]!)],
    [{ first: rowB![0]!, last: rowB![2]! }, span(rowB![3]!)],
  ];
  const result = apply(source, alignColumnsWithOptionalCells(rows));
  const lines = result.split('\n');
  // row A's term "a bb" spans width 4; row B's term "c d e" spans width 5
  // col0 width = max(4,5) = 5; row A pad = 5 - 4 + 1 = 2
  assert.equal(lines[0], 'a bb' + '  ' + 'x');
  assert.equal(lines[1], 'c d e' + ' ' + 'y');
});

test('refuses when rows have different slot counts', () => {
  const source = ['a b', 'c d e'].join('\n');
  const [rowA, rowB] = rowsOf(source);
  const rows: (AlignSpan | undefined)[][] = [
    [span(rowA![0]!), span(rowA![1]!)],
    [span(rowB![0]!), span(rowB![1]!), span(rowB![2]!)],
  ];
  assert.deepEqual(alignColumnsWithOptionalCells(rows), []);
});

test('refuses fewer than 2 rows', () => {
  const source = 'a b';
  const [row] = rowsOf(source);
  assert.deepEqual(alignColumnsWithOptionalCells([[span(row![0]!), span(row![1]!)]]), []);
});

test('does not falsely trigger overlength refusal from an always-empty column', () => {
  const source = ['a x', 'b y'].join('\n');
  const [rowA, rowB] = rowsOf(source);
  const rows: (AlignSpan | undefined)[][] = [
    [span(rowA![0]!), undefined, span(rowA![1]!)],
    [span(rowB![0]!), undefined, span(rowB![1]!)],
  ];
  const edits = alignColumnsWithOptionalCells(rows);
  assert.ok(edits.length > 0, 'should not have refused due to a phantom always-empty-column width');
});
