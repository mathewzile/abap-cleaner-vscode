# 08 — Roadmap

Phases are sequenced by dependency, not by calendar. Each has a concrete exit criterion.

## Current Status

The foundational core, VS Code formatter/linter integration, settings-schema verification, profiles, range expansion, and 56 bounded ABAP rules are implemented. The current core suite has 207 passing tests. This roadmap describes the remaining route to broader compatibility; its original phase exit criteria have not been met as written.

## Phase 0 — Scaffold

- Monorepo (`packages/core`, `packages/vscode-extension`, `tools/`), TypeScript strict mode,
  ESLint rule banning `vscode` imports inside `core`.
- Direct TypeScript rule tests, core-isolation verification, and settings-schema verification.
- CI: build, lint, test, schema-drift check.

**Exit:** The workspace builds, typechecks, and tests a functional TypeScript engine end-to-end.

## Phase 1 — Parser foundation

Stage A of [03-engine-port.md](03-engine-port.md): `Language`, `ABAP`, `DDL`, `StringUtil`,
`AbapCult`, `Token`, `Term`, `Tokenizer`, `Command`, `Code`, `CleanupRange`.

**Exit:** L1 round-trip test passes — every file in the sample corpus parses and re-serializes
byte-identically. This is the highest-risk phase; roughly a third of the total engine LOC and
everything downstream depends on it being exact.

## Phase 2 — Rule infrastructure

Stage B: `RuleID`, `RuleGroupID`, `Config*Value`, `Rule` + five abstract bases, `Profile` with
`.cfj` read/write, `default`/`essential` profile generation, `listRules()`, schema generator.

**Exit:** Profile resolution and settings-schema coverage are unit-tested for every registered rule.

## Phase 3 — First vertical slice

Port `EMPTY_LINES` (5 rules) and `SPACES` (5 rules), then wire the formatter providers.

**Exit:** A `.clas.abap` file formats correctly in the Extension Development Host with
`formatOnSave`, and all 10 rules pass their imported suites. This is the first genuinely useful
build and it de-risks every remaining assumption.

## Phase 4 — ABAP rule waves

`PRETTY_PRINTER` (4) → `DECLARATIONS` (13) → `COMMANDS` (18) → `ALIGNMENT` (17) → `SYNTAX` (17).

Each wave ends with direct and integration coverage for the documented supported scope. `ALIGNMENT` pulls in the bulk of parser and formatting infrastructure; `SYNTAX` carries substantial semantic risk.

**Exit:** All intended ABAP rules pass their TypeScript compatibility suites without Java runtime dependencies.

## Phase 5 — Linting

Port `comparer`, add per-rule line attribution to `CleanupResponse.appliedRules`, implement the
diagnostics provider, the three code-action kinds, and `source.fixAll.abapCleaner`.

**Exit:** Squiggles with working quick fixes and a functioning `codeActionsOnSave`.

## Phase 6 — DDL/DCL rules

Stage D: 21 rules across `DDL_ANNOTATIONS`, `DDL_EMPTY_LINES`, `DDL_SPACES`, `DDL_POSITION`,
`DDL_ALIGNMENT`.

**Exit:** `.ddls.asddls`, `.ddlx.asddlxs`, `.dcls.asdcls` format correctly; all DDL suites pass.

## Phase 7 — Release

Batch `cleanWorkspace` command, profile export, README/docs, marketplace metadata, packaging.

**Exit:** Installable `.vsix`, single artifact, no platform matrix.

## Phase 8 — Rust core (optional)

Only if the Phase 4 performance gate is missed, or once TS parity is complete and the team wants
the throughput. Follows [07-rust-migration.md](07-rust-migration.md).

---

## Open items

| # | Item | Blocks | Notes |
|---|---|---|---|
| 1 | Confirm AFF suffixes for CDS entity extensions, CDS types, CDS aspects, CDS entity buffers | Phase 3 | Must be read off a real ADT checkout, not guessed |
| 2 | Confirm the language ids `SAPSE.adt-vscode` contributes | Phase 3 | Determines whether we contribute CDS language ids or only file patterns |
| 3 | Publisher id and extension name | Phase 7 | Must not collide with `SAPOSS.abap-cleaner` |
| 4 | Licensing/attribution for the port | Phase 0 | Upstream is Apache-2.0; derivative work must retain `NOTICE` and per-file attribution |
| 5 | Upstream sync policy | Phase 4 | Pin to v1.29.0 for the initial port; decide cadence for tracking later releases |
| 6 | Whether to bundle a CLI | Phase 7 | Engine package makes it cheap; not required by scope |

Item 4 is not a formality — this is a substantial derivative work of an Apache-2.0 SAP project,
and the per-file `// Ported from …` headers required in
[03-engine-port.md](03-engine-port.md) are part of satisfying it.
