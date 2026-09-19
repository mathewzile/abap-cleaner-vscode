// Ported from com/sap/adt/abapcleaner/rules/alignment/AlignCondExpressionsRule.java @ v1.29.0.
//
// Bounded subset: upstream aligns `COND type( WHEN ... THEN ... ELSE ... )` and `SWITCH type(
// operand WHEN ... THEN ... ELSE ... )` constructor expressions, with real tabular column alignment
// (`AlignTable`, 8 columns) for the "tabular" case (2+ `WHEN` branches). This port handles only
// `COND` (not `SWITCH`, which has an extra `operand` token between `(` and the first `WHEN` this
// port doesn't parse) with EXACTLY one `WHEN` branch — upstream's own default for that specific
// shape (`SimpleStyle = VERTICAL_LAYOUT`) puts `WHEN`, `THEN`, and `ELSE` each on their own line,
// hang-indented to `WHEN`'s own column — confirmed against `AlignColumn.java`'s actual mechanism
// (`setForceLineBreakAfter`/`setForceIndent(0)` on the THEN/ELSE columns, relative to `WHEN`'s
// `basicIndent`), not just inferred from `getExample()`. An already single-line expression (the
// whole `(...)` span on one source line) is left completely untouched, matching upstream's
// `OneLinerStyle = KEEP` default. A `LET ... IN` prefix (a real, more complex upstream-supported
// case) and any 2nd-or-later `WHEN` (the tabular, width-simulated case) both refuse the WHOLE
// construct rather than partially transform it. A comment ANYWHERE inside the `COND`'s parentheses
// also refuses the whole construct — `breakBeforeWithIndent`'s per-call "skip if directly preceded
// by a comment" behavior could otherwise leave `THEN` and `ELSE` split inconsistently (one
// repositioned, the other silently left in place because of a comment between them), which would be
// a genuinely surprising half-applied result rather than an honest narrowing; refusing up front
// avoids that. Depth tracking for finding `THEN`/`ELSE`/a repeated `WHEN` counts ONLY `(`/`)` (never
// `{`/`}`/`[`/`]`); ABAP constructor expressions never use `{`/`[` for their own structure, so
// restricting to `(`/`)` loses nothing. This does NOT fully protect against a `THEN`/`ELSE` value
// containing a string template with an embedded expression (`|{ expr }|`) — this port's shared
// tokenizer has a confirmed, pre-existing bug where the template's closing `|` is misread as
// *opening* a new template segment, swallowing everything after it (potentially including this
// rule's own later tokens, or even later Commands) into one bogus token. That bug lives in
// `parser/tokenizer.ts` and affects every rule that scans raw tokens across such a template, not
// something specific to this rule; fixing it is out of scope here and is reported separately. A
// nested `COND` inside this one's `THEN`/`ELSE` value is handled independently, since the whole
// token stream is scanned for every `COND` occurrence as its own unit.
//
// Transform: forces a line break at `WHEN`'s own column (hang-indented to wherever `WHEN` actually
// sits, not a computed formula) before `THEN` if it isn't already there, and before `ELSE` (if
// present) if it isn't already there. The `THEN`/`ELSE` VALUE content itself is never touched — this
// rule only ever decides where to insert a line break, never pads or aligns a column, so a value can
// be an arbitrary multi-token expression. Not implemented: `SWITCH`, a `LET ... IN` prefix, the
// multi-`WHEN` tabular case, `MaxLineLength`-driven one-liner creation.
import { tokenize, type Token } from '../../parser/tokenizer.js';
import { applyEdits, breakBeforeWithIndent, nextCodeIndex, type Edit } from '../ddl/position-helpers.js';

export function alignCondExpressions(sourceText: string): string {
  const tokens = tokenize(sourceText, 'ABAP');

  const edits: Edit[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.kind !== 'word' || token.text.toUpperCase() !== 'COND') continue;

    const typeIndex = nextCodeIndex(tokens, index);
    if (typeIndex === undefined) continue;
    const parenIndex = nextCodeIndex(tokens, typeIndex);
    if (parenIndex === undefined || tokens[parenIndex]!.text !== '(') continue;

    const closeIndex = findMatchingParen(tokens, parenIndex);
    if (closeIndex === undefined) continue;

    edits.push(...processCondBody(sourceText, tokens, parenIndex, closeIndex));
  }

  return applyEdits(sourceText, edits);
}

function findMatchingParen(tokens: readonly Token[], openIndex: number): number | undefined {
  let depth = 1;
  for (let index = openIndex + 1; index < tokens.length; index += 1) {
    if (tokens[index]!.text === '(') depth += 1;
    else if (tokens[index]!.text === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return undefined;
}

function processCondBody(sourceText: string, tokens: readonly Token[], openIndex: number, closeIndex: number): readonly Edit[] {
  for (let index = openIndex; index <= closeIndex; index += 1) {
    if (tokens[index]!.kind === 'comment') return [];
  }
  if (tokens[openIndex]!.line === tokens[closeIndex]!.line) return [];

  const whenIndex = nextCodeIndex(tokens, openIndex);
  if (whenIndex === undefined || whenIndex >= closeIndex) return [];
  const whenToken = tokens[whenIndex]!;
  if (whenToken.kind !== 'word' || whenToken.text.toUpperCase() !== 'WHEN') return [];

  let depth = 0;
  let thenIndex: number | undefined;
  for (let index = whenIndex + 1; index < closeIndex; index += 1) {
    const token = tokens[index]!;
    if (token.text === '(') depth += 1;
    else if (token.text === ')') depth -= 1;
    if (depth === 0 && token.kind === 'word' && token.text.toUpperCase() === 'THEN') {
      thenIndex = index;
      break;
    }
  }
  if (thenIndex === undefined) return [];

  let elseIndex: number | undefined;
  depth = 0;
  for (let index = thenIndex + 1; index < closeIndex; index += 1) {
    const token = tokens[index]!;
    if (token.text === '(') depth += 1;
    else if (token.text === ')') depth -= 1;
    if (depth !== 0 || token.kind !== 'word') continue;
    const upper = token.text.toUpperCase();
    if (upper === 'WHEN') return [];
    if (upper === 'ELSE') {
      elseIndex = index;
      break;
    }
  }

  const indent = columnOf(sourceText, whenToken.offset);
  const edits: Edit[] = [...breakBeforeWithIndent(tokens, thenIndex, indent)];
  if (elseIndex !== undefined) edits.push(...breakBeforeWithIndent(tokens, elseIndex, indent));
  return edits;
}

function columnOf(sourceText: string, offset: number): number {
  return offset - (sourceText.lastIndexOf('\n', offset - 1) + 1);
}
