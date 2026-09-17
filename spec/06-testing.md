# 06 — Testing Strategy

## The oracle

`test/com.sap.adt.abapcleaner.test` contains **145 files / 67,332 LOC** of JUnit 5 tests — more
test code than the 57,535 LOC of engine code. It is valuable behavioral reference material when a local upstream checkout is available, but it is excluded from this repository and never required to build or test the TypeScript port.

Each bounded TypeScript rule needs direct conversion, refusal, and integration tests. Where an upstream test or documented example exists, use it as a behavioral source; otherwise state the narrower supported behavior explicitly rather than implying upstream parity.

## Fixture format is mechanically translatable

Upstream tests extend `RuleTestBase` and use a fixed vocabulary:

```java
public class NeedlessSpacesTest extends RuleTestBase {
   NeedlessSpacesTest() {
      super(RuleID.NEEDLESS_SPACES);
      rule = (NeedlessSpacesRule)getRule();
      rule.configSearchAcrossEmptyLines.setValue(true);   // per-suite config
   }

   @Test
   void testSimpleCases() {
      buildSrc("    CLEAR:    ev_value,");                // input line
      buildExp("    CLEAR: ev_value,");                   // expected line
      putAnyMethodAroundSrcAndExp();                      // wrap in a method
      testRule();
   }
}
```

Only a handful of primitives appear: `buildSrc`, `buildExp`, `copyExpFromSrc`,
`putAnyMethodAroundSrcAndExp`, `putAnyClassDefAroundSrcAndExp`, `testRule`, `deactivateSyntaxCheckAfterParse`,
plus `config*.setValue(...)`. `tools/import-java-fixtures.ts` parses these with a small regex-based
reader and emits TS fixtures:

```
packages/core/test/fixtures/spaces/NeedlessSpaces/simpleCases.json
{ "config": { "searchAcrossEmptyLines": true, ... }, "src": "...", "exp": "..." }
```

Generated fixtures are **committed**, so the Java tree is not a build dependency. The importer is
re-run when syncing to a new upstream version, and the fixture diff is the review artifact.

`RuleTestBase` itself is ported by hand to a TS harness exposing the same primitives, so a
generated fixture plus the harness reproduces the Java assertion exactly.

## Test layers

| Layer | Scope | Source |
|---|---|---|
| **L1 — Tokenizer/parser** | `Code` round-trips: `parse(text).toString() === text` for every fixture and sample | Generated; plus upstream `parser` tests |
| **L2 — Rule golden tests** | One rule, fixed config, src → exp | Imported from Java, ~1 suite per rule |
| **L3 — Profile integration** | Full `default` and `essential` profiles over whole documents | `vscode-extension/samples/*`, upstream sample files |
| **L4 — Idempotence** | `clean(clean(x)) === clean(x)` | Property test over all L2/L3 inputs |
| **L5 — Extension** | Providers, settings resolution, diagnostics | `@vscode/test-electron` |

L4 is not in the upstream suite but is cheap and catches whole classes of alignment/spacing
oscillation bugs.

## Invariants asserted on every fixture

Beyond `actual === expected`:

1. **No syntax destruction** — re-parsing the cleaned text must succeed and yield the same
   statement count, unless the rule legitimately removes statements.
2. **Idempotence** — a second pass changes nothing.
3. **Line-ending preservation** — `\r\n` input yields `\r\n` output.
4. **Trailing-newline preservation**.
5. **No trailing whitespace introduced**.

## Differential testing against the reference

Not implemented and not part of the current project policy: the port must not execute Java or depend on the excluded reference checkout. Differential testing can be reconsidered only through a separately maintained external compatibility harness; it must not become a build, test, or CI requirement for this repository.

## Coverage gate

A registered rule is done only for its documented bounded scope when direct tests, profile integration, idempotence checks, and line-ending preservation pass. Rules without a safe TypeScript implementation remain absent from the registry rather than silently no-oping.

## Performance budget

Upstream cleans ~500 KB/s. Target for the TS engine: within 3× of that (≥150 KB/s) on the L3
corpus, measured in CI. Slower than that makes `formatOnSave` noticeable and moves the Rust port
from "nice to have" to required.
