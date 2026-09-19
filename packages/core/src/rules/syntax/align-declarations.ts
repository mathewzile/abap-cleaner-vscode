// Ported from com/sap/adt/abapcleaner/rules/alignment/AlignDeclarationsRule.java @ v1.29.0
//
// Bounded subset: of the 8 upstream columns (KEYWORD, IDENTIFIER, TYPE, LENGTH, DECIMALS, VALUE,
// READ_ONLY, LINE_END_COMMENT) and its nested-table-set handling for `BEGIN OF`/`END OF` structures
// and `TYPES`, only `DATA`/`CONSTANTS`/`FIELD-SYMBOLS` declarations of the simple shape
// `<name> TYPE <single-token-type> [VALUE <single-token-value>].` are handled, in two independent
// grouping modes matching upstream's own two entry points: (a) a maximal run of consecutive,
// non-chained declarations sharing the same keyword AND the same VALUE-presence (a run with mixed
// VALUE-having/VALUE-lacking rows splits at the boundary rather than refusing outright, since a
// uniform column shape is required either way), and (b) the items of one chained declaration
// (`DATA: a TYPE i, b TYPE string.`), aligned independently of any surrounding run, matching
// upstream. Both reuse the shared `alignColumnsLeftAligned` engine. A row only extends a run (or a
// chain-item only counts as a sibling) if it sits on its own distinct source line — alignment is a
// vertical/cross-line concept, so two declarations (or chain items) crammed onto one physical line
// are left untouched rather than "aligned" against each other. Not implemented: `TYPES`
// declarations, `BEGIN OF`/`END OF` structures (a declaration using either is simply not recognized
// — refusing that one declaration, not the whole run/chain, since it can't match the simple shape
// at all), `LIKE` (only `TYPE` is recognized), `LENGTH`/`DECIMALS`/`READ-ONLY` additions, a `VALUE`
// spanning more than one token (e.g. `VALUE a && b`, `VALUE IS INITIAL`), a trailing line-end
// comment, or a declaration spanning more than one line.
import { parseAbapCommands, type Command } from '../../parser/commands.js';
import type { Token } from '../../parser/tokenizer.js';
import { alignColumnsLeftAligned } from './align-helpers.js';

const DECLARATION_KEYWORDS = new Set(['DATA', 'CONSTANTS', 'FIELD-SYMBOLS']);

interface Edit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

interface SimpleDeclaration {
  readonly keyword: string;
  readonly cells: readonly Token[];
}

export function alignDeclarations(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const edits: Edit[] = [...alignConsecutiveRuns(commands), ...alignChains(commands)];
  return edits.reduceRight((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), sourceText);
}

function alignConsecutiveRuns(commands: readonly Command[]): Edit[] {
  const rows = commands.map(parseSimpleDeclaration);
  const edits: Edit[] = [];

  let runStart = 0;
  while (runStart < rows.length) {
    if (rows[runStart] === undefined) {
      runStart += 1;
      continue;
    }
    let runEnd = runStart;
    while (
      runEnd + 1 < rows.length
      && rows[runEnd + 1] !== undefined
      && rows[runEnd + 1]!.keyword === rows[runStart]!.keyword
      && rows[runEnd + 1]!.cells.length === rows[runStart]!.cells.length
      && rows[runEnd + 1]!.cells[0]!.line !== rows[runEnd]!.cells[0]!.line
    ) {
      runEnd += 1;
    }
    if (runEnd > runStart) {
      edits.push(...alignColumnsLeftAligned(rows.slice(runStart, runEnd + 1).map((row) => row!.cells)));
    }
    runStart = runEnd + 1;
  }

  return edits;
}

function alignChains(commands: readonly Command[]): Edit[] {
  const edits: Edit[] = [];
  for (const command of commands) {
    const chain = parseChainDeclaration(command);
    if (chain === undefined) continue;

    let groupStart = 0;
    while (groupStart < chain.length) {
      let groupEnd = groupStart;
      while (groupEnd + 1 < chain.length && chain[groupEnd + 1]![0]!.line !== chain[groupEnd]![0]!.line) {
        groupEnd += 1;
      }
      if (groupEnd > groupStart) edits.push(...alignColumnsLeftAligned(chain.slice(groupStart, groupEnd + 1)));
      groupStart = groupEnd + 1;
    }
  }
  return edits;
}

function parseSimpleDeclaration(command: Command): SimpleDeclaration | undefined {
  if (command.startLine !== command.endLine) return undefined;
  const code = command.tokens.filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
  if (code.length < 4) return undefined;
  const keyword = code[0]!;
  if (keyword.kind !== 'word' || !DECLARATION_KEYWORDS.has(keyword.text.toUpperCase())) return undefined;
  if (code[1]!.text === ':') return undefined;

  const fields = parseDeclarationFields(code, 0);
  if (fields === undefined || code[fields.nextIndex]?.text !== '.' || fields.nextIndex + 1 !== code.length) return undefined;

  return { keyword: keyword.text.toUpperCase(), cells: declarationCells(fields) };
}

function parseChainDeclaration(command: Command): (readonly Token[])[] | undefined {
  const code = command.tokens.filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
  if (code.length < 2) return undefined;
  const keyword = code[0]!;
  if (keyword.kind !== 'word' || !DECLARATION_KEYWORDS.has(keyword.text.toUpperCase())) return undefined;
  if (code[1]!.text !== ':') return undefined;

  const items: DeclarationFields[] = [];
  let cursor = 2;
  while (cursor < code.length) {
    const fields = parseDeclarationFields(code, cursor - 1);
    if (fields === undefined) return undefined;
    const separator = code[fields.nextIndex];
    if (separator?.text !== ',' && separator?.text !== '.') return undefined;
    items.push(fields);
    cursor = fields.nextIndex + 1;
    if (separator.text === '.') break;
  }
  if (cursor !== code.length) return undefined;

  const hasValue = items[0]!.value !== undefined;
  if (items.some((item) => (item.value !== undefined) !== hasValue)) return undefined;

  return items.map(declarationCells);
}

interface DeclarationFields {
  readonly name: Token;
  readonly typeKeyword: Token;
  readonly type: Token;
  readonly valueKeyword: Token | undefined;
  readonly value: Token | undefined;
  readonly nextIndex: number;
}

function parseDeclarationFields(code: readonly Token[], afterIndex: number): DeclarationFields | undefined {
  const name = code[afterIndex + 1];
  const typeKeyword = code[afterIndex + 2];
  const type = code[afterIndex + 3];
  if (name?.kind !== 'word' || typeKeyword?.text.toUpperCase() !== 'TYPE' || type?.kind !== 'word') return undefined;

  let nextIndex = afterIndex + 4;
  let valueKeyword: Token | undefined;
  let value: Token | undefined;
  if (code[nextIndex]?.kind === 'word' && code[nextIndex]!.text.toUpperCase() === 'VALUE') {
    valueKeyword = code[nextIndex];
    value = code[nextIndex + 1];
    if (value === undefined) return undefined;
    nextIndex += 2;
  }
  return { name, typeKeyword, type, valueKeyword, value, nextIndex };
}

function declarationCells(fields: DeclarationFields): readonly Token[] {
  const base = [fields.name, fields.typeKeyword, fields.type];
  return fields.value === undefined ? base : [...base, fields.valueKeyword!, fields.value];
}
