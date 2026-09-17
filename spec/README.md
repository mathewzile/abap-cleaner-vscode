# ABAP Cleaner for VS Code — Specification

Port of the automated cleanup engine of [SAP/abap-cleaner](https://github.com/SAP/abap-cleaner)
to a VS Code extension that behaves like the Biome formatter: format + lint, configured
entirely through VS Code settings, no interactive GUI.

The upstream Java/Eclipse project is a behavioral reference only. A local checkout may be kept in `reference-eclipse-plugin/`, but that directory is excluded from Git and is never a runtime or build dependency.

## Documents

| # | Document | Contents |
|---|---|---|
| 01 | [scope.md](01-scope.md) | Goals, non-goals, supported object types and file extensions |
| 02 | [architecture.md](02-architecture.md) | Layering, engine boundary, process model |
| 03 | [engine-port.md](03-engine-port.md) | Java → TypeScript port mapping and sequencing |
| 04 | [configuration.md](04-configuration.md) | Profiles, rules, VS Code settings schema |
| 05 | [vscode-integration.md](05-vscode-integration.md) | Formatter, diagnostics, code actions, commands |
| 06 | [testing.md](06-testing.md) | Golden-test strategy derived from the Java test suite |
| 07 | [rust-migration.md](07-rust-migration.md) | How the TS engine is swapped for a Rust core |
| 08 | [roadmap.md](08-roadmap.md) | Phases, milestones, exit criteria |

## Baseline measurements

Taken from the reference plugin at `com.sap.adt.abapcleaner` (v1.29.0).

| Area | Java LOC | Notes |
|---|---|---|
| `base` | 4,042 | `ABAP.java` (1,157), `DDL.java` (710), string/culture utils |
| `parser` | 11,337 | `Token.java` (3,949), `Command.java` (4,192), `Code.java` (732), `Tokenizer.java` (381) |
| `rulebase` | 3,392 | `Rule`, `Profile`, `Config*Value`, `RuleID`, `RuleGroupID` |
| `rulehelpers` | 9,119 | Shared analysis helpers used by many rules |
| `rules` | 25,306 | 100 concrete rule classes |
| `comparer` | 1,904 | Diff engine — needed for lint diagnostics, not for formatting |
| `programbase` | 2,435 | Job/Task/Release infrastructure |
| **Total** | **57,535** | |
| Test project | 67,332 | 145 test files — the correctness oracle (see [06-testing.md](06-testing.md)) |

`Rule.RULE_COUNT = 100`, `Rule.RULE_GROUP_COUNT = 12` (7 ABAP groups + 5 DDL groups).

## Status

The TypeScript core and VS Code extension are implemented and currently register 56 bounded ABAP cleanup rules. The core suite has 207 passing tests. DDL/DCL cleanup, full parser/pretty-printer parity, semantic analysis, `.cfj` compatibility, and the Rust replacement remain future work. The phase documents below are retained as architecture and roadmap material; their full-parity milestones are not yet complete.
