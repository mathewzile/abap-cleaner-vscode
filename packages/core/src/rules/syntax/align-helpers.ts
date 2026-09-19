// Ported from com/sap/adt/abapcleaner/rulehelpers/AlignTable.java, AlignColumn.java @ v1.29.0
//
// Bounded subset of upstream's general multi-column alignment engine: left-aligned columns only
// (pad every cell's trailing gap to the widest cell in its column, `columnWidth = maxCellWidth + 1`
// matching upstream's mandatory 1-space gap baked into column width), single-token cells only (a
// cell needing more than one token — e.g. `VALUE(x)` or a multi-word type clause — is out of scope;
// callers must not pass one), and no right-aligned columns, forced cross-column indents, or
// overlength-line mid-cell splitting (upstream's optional fallback most callers don't use either).
// Every row must have the same column count, or the whole call is refused; grouping which rows
// belong together is entirely the caller's responsibility, matching upstream (`AlignTable` itself
// has no grouping concept either — every rule builds its own rows).
import type { Token } from '../../parser/tokenizer.js';

interface Edit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

const MAX_LINE_WIDTH = 255;

export function alignColumnsLeftAligned(rows: readonly (readonly Token[])[]): Edit[] {
  if (rows.length < 2) return [];
  const columnCount = rows[0]!.length;
  if (columnCount < 2 || rows.some((row) => row.length !== columnCount)) return [];

  const widths = Array.from({ length: columnCount - 1 }, (_, index) => Math.max(...rows.map((row) => row[index]!.text.length)));
  if (widths.reduce((sum, width) => sum + width + 1, 0) > MAX_LINE_WIDTH) return [];

  const edits: Edit[] = [];
  for (const row of rows) {
    for (let index = 0; index < columnCount - 1; index += 1) {
      const cell = row[index]!;
      const next = row[index + 1]!;
      const pad = ' '.repeat(widths[index]! - cell.text.length + 1);
      edits.push({ start: cell.offset + cell.text.length, end: next.offset, text: pad });
    }
  }
  return edits;
}

// Ported from the same com/sap/adt/abapcleaner/rulehelpers/AlignTable.java, AlignColumn.java
// engine as `alignColumnsLeftAligned` above, extended with the two capabilities that engine
// deliberately excludes: a cell may span more than one token (`AlignSpan`, width computed as
// `last.offset + last.text.length - first.offset`, matching upstream's `AlignCellTerm`), and a row
// may have NO cell for some TRAILING column (`undefined`), matching upstream's real null-cell
// handling in `AlignTable.align()`: a missing cell contributes no padding of its own but its whole
// column width still accumulates onto the gap written before the row's next PRESENT cell. A column
// with NO cell in ANY row contributes zero width (matching upstream's `AlignColumn.isEmpty()` short
// circuit) rather than being treated like an ordinary present-but-empty column — getting this wrong
// would inject a spurious extra space before every row's next present cell whenever an entire column
// goes unused. Column 0 (the first slot) must be present in EVERY row — upstream's real engine
// rewrites each token's absolute position from scratch, so a "missing leading column" there just
// becomes a wider `spacesLeft` before the row's first present cell; this port's edit model only ever
// inserts padding BETWEEN two already-existing token positions (matching how every other rule in
// this port works — no rule here rewrites a row's own leading indentation), so there is no
// well-defined place to anchor a leading gap that doesn't depend on assumptions about a row's
// pre-existing indentation this function has no visibility into. A caller whose upstream rule needs
// a sparse LEADING column (e.g. `DdlAlignSelectListRule`'s `KEY_OR_VIRTUAL`) must refuse rather than
// approximate that case, the same way every other bounded rule in this port refuses an upstream
// capability it doesn't implement. `alignColumnsLeftAligned` above is left completely untouched;
// this is an additive sibling for the few callers that need Term cells or sparse trailing columns,
// not a replacement. Still not implemented: right-alignment, multi-line cells, and the
// overlength-line mid-cell-splitting fallback. Every row must have the SAME NUMBER OF SLOTS
// (`undefined` counts as a slot) or the whole call is refused; callers must build each row
// positionally (a fixed slot per logical column, `undefined` where that column doesn't apply to this
// row) — filtering out missing cells before calling would silently misalign column semantics across
// rows without tripping this refusal check. CALLER RESPONSIBILITY, not enforced by this function: a
// gap is always written by REPLACING whatever sits between two present cells with pure spaces, so a
// caller must never pass two cells in one row that already sit on DIFFERENT source lines — doing so
// would destructively merge that line break away. A caller whose real data sometimes has a later
// cell on its own separate line (e.g. `DDL_ALIGN_DATA_SOURCES`'s `ON_CONDITION`, commonly pushed
// onto its own line by `DDL_POSITION_JOIN`) must itself omit that cell (pass `undefined`) for any row
// where it isn't on the same line as the row's previous included cell, rather than pass it as-is.
export interface AlignSpan {
  readonly first: Token;
  readonly last: Token;
}

export function alignColumnsWithOptionalCells(rows: readonly (readonly (AlignSpan | undefined)[])[]): Edit[] {
  if (rows.length < 2) return [];
  const columnCount = rows[0]!.length;
  if (columnCount < 2 || rows.some((row) => row.length !== columnCount)) return [];
  if (rows.some((row) => row[0] === undefined)) return [];

  const spanWidth = (cell: AlignSpan): number => cell.last.offset + cell.last.text.length - cell.first.offset;

  const isEmpty = Array.from({ length: columnCount - 1 }, (_, colIndex) => rows.every((row) => row[colIndex] === undefined));
  const widths = Array.from({ length: columnCount - 1 }, (_, colIndex) => {
    const defined = rows.map((row) => row[colIndex]).filter((cell): cell is AlignSpan => cell !== undefined);
    return defined.length === 0 ? 0 : Math.max(...defined.map(spanWidth));
  });
  const gap = (colIndex: number): number => (isEmpty[colIndex]! ? 0 : widths[colIndex]! + 1);

  if (Array.from({ length: columnCount - 1 }, (_, colIndex) => gap(colIndex)).reduce((sum, width) => sum + width, 0) > MAX_LINE_WIDTH) return [];

  const edits: Edit[] = [];
  for (const row of rows) {
    const definedIndices = row.map((cell, index) => (cell === undefined ? -1 : index)).filter((index) => index !== -1);

    for (let k = 0; k < definedIndices.length - 1; k += 1) {
      const i = definedIndices[k]!;
      const j = definedIndices[k + 1]!;
      const cellI = row[i]!;
      const cellJ = row[j]!;
      let pad = widths[i]! - spanWidth(cellI) + 1;
      for (let colIndex = i + 1; colIndex < j; colIndex += 1) pad += gap(colIndex);
      edits.push({ start: cellI.last.offset + cellI.last.text.length, end: cellJ.first.offset, text: ' '.repeat(pad) });
    }
  }
  return edits;
}
