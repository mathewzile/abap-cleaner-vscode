# 01 — Scope

## Goals

- Port the **automated cleanup** of ABAP cleaner to a self-contained VS Code extension (`.vsix`).
- Behave like the Biome extension: a **document/range formatter** plus a **linter** that
  publishes diagnostics with quick fixes.
- **Profiles** and **individual rules** independently switchable via VS Code settings.
- Engine implemented in TypeScript first, behind an interface that lets a Rust core replace it
  without touching extension code (see [07-rust-migration.md](07-rust-migration.md)).

## Non-goals

- Interactive cleanup UI / diff window (Eclipse SWT `com.sap.adt.abapcleaner.gui`).
- Read-only preview window.
- Shipping or launching a Java/Eclipse RCP binary. The existing SAP extension does exactly this
  (`BinaryManager.ts`, `DaemonClient.ts`); we deliberately do **not**.
- Backend calls to an ABAP system. Cleanup is restricted to what is derivable from the open
  document, matching the upstream limitation.
- Stand-alone CLI (may be added later — the engine package makes it cheap).

## Language support in the engine

The current TypeScript engine applies bounded cleanup rules to ABAP only. It detects other source forms for extension routing, but leaves DDL, DCL, and BDEF unchanged. The table below records upstream capability and is a future-port reference, not current behavior.

`base/Language.java` defines what the parser can classify:

| Language | Cleanup rules exist | Notes |
|---|---|---|
| `ABAP` | Yes — 79 rules | Classes, interfaces, programs, function groups, type groups |
| `DDL` | Yes — 21 rules | CDS data definitions, metadata extensions |
| `DCL` | Yes — subset | Rules declared with `ddlOrDcl`; CDS access controls |
| `SQLSCRIPT`, `SQL`, `GRAPH`, `LLANG`, `OTHER` | No | Parsed/skipped, left unchanged |
| `NOT_SUPPORTED` | No | **RAP Behavior Definition Language (BDL)** — explicitly unsupported |

`Language.preview(text)` sniffs the document head (skipping `*`/`"`/`//` comments) to pick the
language. The TypeScript port uses this approach because language detection cannot rely on file extension alone —
`.asddls` and `.asbdef` content can both start with `//` comments.

> **Consequence for `.bdef`:** behavior definitions have no cleanup rules in the current TypeScript port. The extension registers the file type, but the engine no-ops.

## Target file extensions

Driven by the object types that **ABAP Development Tools for VS Code** (`SAPSE.adt-vscode`)
supports today, filtered to those that carry ABAP/CDS **source text**.

### In scope

| Object type | Description | Extension | Engine language |
|---|---|---|---|
| `CLAS` | Class — global, plus local definitions/implementations/test classes/macros | `.clas.abap` | ABAP |
| `INTF` | Interface | `.intf.abap` | ABAP |
| `PROG` | Program / include | `.prog.abap` | ABAP |
| `FUGR` | Function module and function group includes | `.fugr.*.abap` | ABAP |
| `TYPE` | Type group (`TYPE-POOL`) | `.type.abap` | ABAP |
| `DDLS` | CDS data definition (CDS view) | `.ddls.asddls` | DDL |
| `DDLX` | CDS metadata extension | `.ddlx.asddlxs` | DDL |
| `DCLS` | CDS access control | `.dcls.asdcls` | DCL |
| `BDEF` | Behavior definition | `.bdef.asbdef` | `NOT_SUPPORTED` — registered, no-op |

### Also accepted (loose files, not in ABAP File Format layout)

`.abap`, `.acds`, `.asddls` — the extensions the reference VS Code extension already keys on in
`vscode-extension/package.json`. These cover CDS/ABAP snippets opened outside an AFF package
checkout.

### Out of scope

Objects with no source body (XML/metadata only): structures, database tables, data elements,
domains, lock objects, service definitions, service bindings, number range objects, change
documents.

### To verify before implementation

The exact AFF suffixes for the newer CDS artifacts listed on the `SAPSE.adt-vscode` marketplace
page — CDS entity extensions, CDS types, CDS aspects, CDS entity buffers. These must be confirmed
against a real ADT-checked-out project rather than guessed. Track as an open item in
[08-roadmap.md](08-roadmap.md).

## Cleanup range

`parser/CleanupRangeExpandMode.java` — the engine expands any selection to a semantic boundary:

- `FULL_STATEMENT` — current statement
- `FULL_METHOD` — current method etc. (**upstream default**)
- `FULL_CLASS` — current class
- `FULL_DOCUMENT` — entire document

Format Document always uses `FULL_DOCUMENT`. Format Selection uses the configured expand mode,
defaulting to `FULL_METHOD`, and always snaps to whole statements.
