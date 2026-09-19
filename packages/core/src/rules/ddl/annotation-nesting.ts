// Ported from com/sap/adt/abapcleaner/rules/ddl/annotations/DdlAnnotationNestingRule.java,
// rulehelpers/DdlAnnotationScope.java, DdlAnnotation.java, DdlAnnotationWriter.java @ v1.29.0.
//
// Bounded subset: upstream builds a full annotation-tree model — alphabetically re-sorts every
// annotation in a scope (`SortOrder`, default `BY_TWO_ELEMS`), groups by shared path prefix at any
// depth starting from a configurable minimum (`NestingMinDepth`, default `LEVEL_3`), and — the part
// that makes a naive bounded port unsafe — runs a *simulated write pass* to measure rendered line
// width before deciding whether a nesting range collapses onto one line
// (`DdlAnnotationScope.determineOneLiners()`, gated by `MaxOneLinerElemCount`, default 4). A first
// attempt at this port assumed skipping that decision entirely ("always render multi-line") was a
// safe narrowing; it is NOT, by default: a nesting range of 4 or fewer members is a one-liner
// *candidate* under the default config and, if it fits, upstream really does collapse it to one line
// — "always multi-line" would silently diverge from real default output for that size. The
// genuinely safe (not merely plausible) bounded slice, confirmed by reading `DdlAnnotationScope`'s
// `MaxOneLinerElemCount` gate directly: a nesting range of **5 or more** members is *never* a
// one-liner candidate regardless of width under the default config (`memberCount >
// MaxOneLinerElemCount`), so "always render multi-line, one member per line" is provably correct for
// that size, not an approximation of it. This port therefore only nests a run of >= 5 CONSECUTIVE
// (no gap, see below) simple annotations sharing an EXACT parent path of >= 3 segments (a
// conservative floor matching `NestingMinDepth`'s default `LEVEL_3` — this may refuse some runs
// upstream's default would also nest, but never nests one upstream's default would leave flat,
// which is the safe direction to err).
//
// "Simple" means: within its own `annotationRanges()` span, an annotation reduces to EXACTLY 3
// non-whitespace tokens — the `@path` word token (this port's DDL tokenizer reads an entire dotted
// path as one token, `.` is not a DDL stop character, so splitting into segments is a string-level
// `path.split('.')` mirroring upstream's own `StringUtil.split()` approach), a `:` colon, and ONE
// value token of any kind. This single check is what naturally excludes every case that would
// otherwise need its own guard: a value that's already a `{...}`/`[...]` structure (its span holds
// more than 3 tokens), and a trailing same-line comment (also captured inside the annotation's own
// span by `annotationRanges()`, also pushing the token count past 3) both refuse without dedicated
// exclusion logic. "Consecutive, no gap" means the source text between two candidate annotations'
// spans is exactly one newline plus only whitespace (`/^\n[ \t]*$/`) — a blank line or a standalone
// comment line between them means the user visually separated them, so the run stops there rather
// than merging across it (this also means grouping never needs upstream's real alphabetical resort:
// already-adjacent, already-same-prefix annotations are exactly what a resort would also group, so
// skipping it is conservative-only — it can miss a nest-worthy group that isn't already adjacent,
// but can never produce a merge a real resort-then-group pass would disagree with).
//
// A merged run is ALWAYS written multi-line — one member per line, hang-indented to the exact column
// right after the opening `{ ` (matching `DdlAnnotationWriter`'s `startLevel()`/`addComma()`
// mechanism, not a fixed per-nesting-level indent), with each member's own last path segment
// left-aligned/padded to the widest member name in the run (matching `DdlAnnotationNestingRange`'s
// local column-width computation — this is local to one run, not global, so it needed no width
// simulation to begin with). Not implemented: nesting fewer than 5 members, a parent path shorter
// than 3 segments, non-adjacent same-prefix annotations, deeper-than-one-level nesting, any
// `SortOrder`/`EmptyLines`/allow-or-block-list config surface, and `determineTablesInArrays()`
// (array/table value handling) — all fixed to one conservative default rather than exposed.
import type { Token } from '../../parser/tokenizer.js';
import { tokenize } from '../../parser/tokenizer.js';
import { annotationRanges, type OffsetRange } from './annotation-ranges.js';
import { applyEdits, type Edit } from './position-helpers.js';

const MIN_RUN_LENGTH = 5;
const MIN_PARENT_SEGMENTS = 3;

interface SimpleAnnotation {
  readonly pathToken: Token;
  readonly path: readonly string[];
  readonly valueToken: Token;
  readonly range: OffsetRange;
}

export function nestDdlAnnotations(sourceText: string): string {
  const tokens = tokenize(sourceText, 'DDL');
  const ranges = annotationRanges(sourceText, tokens);
  const blocks = groupIntoAdjacentBlocks(sourceText, ranges);

  const edits: Edit[] = [];
  for (const block of blocks) {
    const parsed = block.map((range) => parseSimpleAnnotation(tokens, range));
    edits.push(...findRuns(parsed).map((run) => buildEdit(sourceText, run)));
  }

  return applyEdits(sourceText, edits);
}

function groupIntoAdjacentBlocks(sourceText: string, ranges: readonly OffsetRange[]): (readonly OffsetRange[])[] {
  const blocks: OffsetRange[][] = [];
  let current: OffsetRange[] = [];
  for (const range of ranges) {
    if (current.length > 0) {
      const gap = sourceText.slice(current[current.length - 1]!.end, range.start);
      if (!/^\n[ \t]*$/.test(gap)) {
        blocks.push(current);
        current = [];
      }
    }
    current.push(range);
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

function parseSimpleAnnotation(tokens: readonly Token[], range: OffsetRange): SimpleAnnotation | undefined {
  const code = tokens.filter((token) => token.offset >= range.start && token.offset < range.end && token.kind !== 'whitespace');
  if (code.length !== 3) return undefined;
  const [pathToken, colon, valueToken] = code as [Token, Token, Token];
  if (pathToken.kind !== 'word' || !pathToken.text.startsWith('@')) return undefined;
  if (colon.text !== ':') return undefined;

  const path = pathToken.text.slice(1).split('.');
  if (path.length < MIN_PARENT_SEGMENTS + 1) return undefined;

  return { pathToken, path, valueToken, range };
}

function findRuns(parsed: readonly (SimpleAnnotation | undefined)[]): (readonly SimpleAnnotation[])[] {
  const runs: (readonly SimpleAnnotation[])[] = [];
  let runStart = 0;
  while (runStart < parsed.length) {
    if (parsed[runStart] === undefined) {
      runStart += 1;
      continue;
    }
    const parentPath = parentPathOf(parsed[runStart]!);
    let runEnd = runStart;
    while (runEnd + 1 < parsed.length && parsed[runEnd + 1] !== undefined && parentPathOf(parsed[runEnd + 1]!) === parentPath) {
      runEnd += 1;
    }
    if (runEnd - runStart + 1 >= MIN_RUN_LENGTH) {
      runs.push(parsed.slice(runStart, runEnd + 1) as SimpleAnnotation[]);
    }
    runStart = runEnd + 1;
  }
  return runs;
}

function parentPathOf(annotation: SimpleAnnotation): string {
  return annotation.path.slice(0, -1).join('.');
}

function buildEdit(sourceText: string, run: readonly SimpleAnnotation[]): Edit {
  const first = run[0]!;
  const last = run[run.length - 1]!;
  const parentPath = parentPathOf(first);

  const lineStart = sourceText.lastIndexOf('\n', first.pathToken.offset - 1) + 1;
  const originalIndent = first.pathToken.offset - lineStart;

  const names = run.map((annotation) => annotation.path[annotation.path.length - 1]!);
  const maxNameLength = Math.max(...names.map((name) => name.length));

  const headerPrefix = `${' '.repeat(originalIndent)}@${parentPath}: { `;
  const hangingIndent = ' '.repeat(headerPrefix.length);

  const memberLines = run.map((annotation, index) => {
    const name = names[index]!;
    const pad = ' '.repeat(maxNameLength - name.length);
    const isLast = index === run.length - 1;
    return `${name}${pad}: ${annotation.valueToken.text}${isLast ? ' }' : ','}`;
  });

  const text = headerPrefix.slice(originalIndent) + memberLines[0] + memberLines.slice(1).map((line) => `\n${hangingIndent}${line}`).join('');

  return { start: first.pathToken.offset, end: last.valueToken.offset + last.valueToken.text.length, text };
}
