# 03 — Engine Port (Java → TypeScript)

## Module mapping

| Java package | TS module | Java LOC | Priority |
|---|---|---|---|
| `base` | `core/src/base` | 4,042 | P0 |
| `parser` | `core/src/parser` | 11,337 | P0 |
| `rulebase` | `core/src/rulebase` | 3,392 | P0 |
| `rulehelpers` | `core/src/rulehelpers` | 9,119 | P1 — port on demand per rule |
| `rules/*` | `core/src/rules/abap/*` | ~19,800 | P1 |
| `rules/ddl/*` | `core/src/rules/ddl/*` | ~5,500 | P2 |
| `comparer` | `core/src/comparer` | 1,904 | P2 — lint only |
| `programbase` | folded into `core/src/rulebase` | 2,435 | P0 — subset only |

`programbase` carries Eclipse `Job`/`Task`/progress plumbing. Only `Release` (ABAP release
gating), the `UnexpectedSyntax*` error types, and the line/change counters are needed; the rest is
dropped.

## Port order

### Stage A — parser foundation (blocking everything else)

1. `base/Language.ts` — including `preview()` content sniffing.
2. `base/ABAP.ts` (1,157 LOC) and `base/DDL.ts` (710 LOC) — keyword tables, operator sets,
   comment signs, release constants. Largely data; transcribe, don't redesign.
3. `base/StringUtil.ts`, `AbapCult.ts` — `AbapCult` implements ABAP's case-insensitive
   comparison semantics; subtle, must be exact.
4. `parser/TokenType.ts` (25 LOC), `parser/Token.ts` (3,949 LOC), `parser/Term.ts` (479 LOC).
5. `parser/Tokenizer.ts` (381 LOC), `parser/Command.ts` (4,192 LOC), `parser/Code.ts` (732 LOC).
6. `parser/TokenSearch.ts`, `CleanupRange.ts`, `CleanupRangeExpandMode.ts`, `CleanupResult.ts`.

`Token` and `Command` are doubly-linked-list nodes with parent/child/sibling links and in-place
mutation. **Keep the mutable linked structure.** A "more idiomatic" immutable rewrite would
invalidate all 100 rules, which are written against exactly this shape, and would forfeit the Java
test suite as an oracle.

### Stage B — rule infrastructure

7. `rulebase/RuleID.ts`, `RuleGroupID.ts` — enums; **ordinal values are the execution order and
   the persisted profile key**, so ordering must be preserved verbatim, including the obsolete-but-
   retained IDs (`SPACES_IN_EMPTY_BRACKETS`, `DECLARATION_CHAIN`) and `ObsoleteRuleID`.
8. `rulebase/ConfigValue.ts` + `ConfigBoolValue`, `ConfigIntValue`, `ConfigEnumValue`,
   `ConfigSelectionValue`, `ConfigTextValue`, `ConfigInfoValue`.
9. `rulebase/Rule.ts` and the five abstract bases: `RuleForCommands`, `RuleForTokens`,
   `RuleForDeclarations`, `RuleForLogicalExpressions`, `RuleForDdlCommands`.
10. `rulebase/Profile.ts` — including `.cfj` read/write via `TextSettingsReader`/`Writer`
    for team-profile interop.

### Stage C — ABAP rules, by group (79 rules)

Ordered cheapest-and-safest first; `SYNTAX` last because those rules carry the most semantic risk.

| Order | Group | Rules | Character |
|---|---|---|---|
| 1 | `EMPTY_LINES` | 5 | Line-level, low risk |
| 2 | `SPACES` | 5 | Token-level whitespace |
| 3 | `PRETTY_PRINTER` | 4 | Keyword case, CamelCase names |
| 4 | `DECLARATIONS` | 13 | Needs declaration-scope helpers |
| 5 | `COMMANDS` | 18 | Obsolete statement replacement |
| 6 | `ALIGNMENT` | 17 | Heaviest helper dependency (`AlignTable` etc.) |
| 7 | `SYNTAX` | 17 | Highest semantic risk |

### Stage D — DDL rules (21 rules)

`DDL_ANNOTATIONS` (2) → `DDL_EMPTY_LINES` (2) → `DDL_SPACES` (4) → `DDL_POSITION` (6) →
`DDL_ALIGNMENT` (7).

### Stage E — comparer

Port `comparer` only when lint diagnostics are implemented. Formatting does not need it.

## Translation conventions

Fixed rules, applied mechanically, so that a Java file and its TS counterpart stay diffable
against future upstream releases:

| Java | TypeScript |
|---|---|
| `enum X { A, B }` with `getValue()`/`forValue()` | `const enum`-style numeric enum, ordinals preserved |
| `StringBuilder` | `string[]` + `join('')` |
| Checked `UnexpectedSyntaxBeforeChanges` | `class UnexpectedSyntaxBeforeChanges extends Error` |
| `int` overflow semantics | not relied upon; assert ranges where Java depended on `int` |
| `String.compareToIgnoreCase` | `AbapCult.compareIgnoringCase` — **not** `toLowerCase()`, locale traps |
| Package-private | `/** @internal */` + not exported from `index.ts` |
| Class + file per rule | Same — one file per rule, same class name |

Keep Java method names verbatim (`executeOn`, `getDisplayName`, `getRequiredAbapRelease`). Renaming
to camelCase idioms is already satisfied; renaming for "clarity" destroys traceability.

Each ported file carries a header comment naming its Java origin and the upstream version it was
ported from, e.g.:

```ts
// Ported from com/sap/adt/abapcleaner/rules/spaces/NeedlessSpacesRule.java @ v1.29.0
```

## ABAP release gating

Rules expose `getRequiredAbapRelease()`; cleanup must not emit syntax newer than the configured
release. Ported as-is and surfaced as the `abapCleaner.abapRelease` setting
(see [04-configuration.md](04-configuration.md)).

## What is deliberately not ported

- `AbapObfuscator`, `DdlObfuscator`, `StressTestParams`, `AbapKeywordFreqBatchJob`,
  `CleanupBatchJob` — development/benchmark tooling.
- `RuleDocumentation`, `MarkdownBuilder` — generates the upstream `docs/rules/*.md`. The
  **metadata** behind it (display name, description, references) is needed for settings
  descriptions and diagnostic messages; the Markdown emitter is not.
- `PersistencyBase`, `FileSystem`, `ProfileDir` — replaced by VS Code workspace/file APIs.
