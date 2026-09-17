# 05 — VS Code Integration

## Language registration

The extension does **not** contribute an `abap` language definition — `SAPSE.adt-vscode` owns it,
and duplicating it would conflict. Instead:

- Contribute language ids only for CDS extensions that may be unclaimed (`asddls`, `asddlxs`,
  `asdcls`, `acds`), each declared with `"configuration"` for comment tokens.
- Register providers against a `DocumentSelector` listing both language ids and file glob
  patterns from [01-scope.md](01-scope.md), so we work whether or not the ADT extension is
  installed.

```ts
const SELECTOR: vscode.DocumentSelector = [
  { language: 'abap', scheme: '*' },
  { pattern: '**/*.{clas,intf,prog,type}.abap' },
  { pattern: '**/*.fugr.*.abap' },
  { pattern: '**/*.{asddls,asddlxs,asdcls,acds,abap}' },
];
```

Final language selection is the engine's `Language.preview()` sniff, not the extension —
`.asbdef` and `.asddls` are indistinguishable by suffix alone in loose-file scenarios.

## Activation

`onLanguage:abap`, `onLanguage:asddls`, … plus `workspaceContains` globs for the AFF patterns.
**Not** `onStartupFinished` — the reference extension uses it only because it has to warm up a
Java daemon. We have no startup cost worth paying.

## Formatting

```ts
vscode.languages.registerDocumentFormattingEditProvider(SELECTOR, provider);
vscode.languages.registerDocumentRangeFormattingEditProvider(SELECTOR, provider);
```

- **Document formatting** → `expandMode: 'FULL_DOCUMENT'`, returns a single full-document
  `TextEdit`.
- **Range formatting** → `expandMode` from settings (default `FULL_METHOD`), returns a
  `TextEdit` covering the *expanded* range. Returning edits outside the requested range is
  permitted and is what makes "clean the current method with no selection" work.
- `lineSeparator` taken from `document.eol`.
- On `errorMessage`, return `[]` and log. Never return a partial document.
- Respect `CancellationToken` between rule executions.

## Linting

There is no report-only mode upstream, so diagnostics are derived from the cleanup result.

1. Run the engine in dry-run mode over the full document.
2. For each entry in `CleanupResponse.appliedRules`, emit one `Diagnostic`:
   - `range` — the rule's line span in the **original** document,
   - `message` — `Rule.getDisplayName()`,
   - `code` — `{ value: RULE_ID, target: <upstream docs/rules/<Rule>.md URI> }`, giving a
     clickable link to the rule documentation,
   - `source` — `abap-cleaner`,
   - `severity` — from `abapCleaner.lint.severity`.
3. Publish to a single `DiagnosticCollection`, cleared on document close.

Triggered per `abapCleaner.lint.run`; `onType` is debounced ~300 ms trailing. Documents above a
size threshold fall back to on-save regardless.

## Code actions

| Kind | Title | Effect |
|---|---|---|
| `QuickFix` | `Apply: <rule display name>` | Re-runs cleanup with a profile where only that rule is enabled, scoped to the diagnostic's range |
| `QuickFix` | `Disable rule <RULE_ID> for this workspace` | Writes `abapCleaner.rules.<ID>.enabled = false` to workspace settings |
| `SourceFixAll` (`source.fixAll.abapCleaner`) | — | Full-document cleanup; participates in `editor.codeActionsOnSave` |

`source.fixAll.abapCleaner` is the Biome-equivalent entry point and lets users clean on save
without making ABAP cleaner their default formatter.

## Commands

| Command | Title | Notes |
|---|---|---|
| `abapCleaner.formatDocument` | ABAP Cleaner: Format Document | Delegates to `editor.action.formatDocument` |
| `abapCleaner.formatSelection` | ABAP Cleaner: Format Selection | Delegates to `editor.action.formatSelection` |
| `abapCleaner.cleanWorkspace` | ABAP Cleaner: Clean All Files in Workspace… | Batch; confirmation dialog + progress; respects `.gitignore` |
| `abapCleaner.showOutput` | ABAP Cleaner: Show Log | Reveals the output channel |
| `abapCleaner.exportProfile` | ABAP Cleaner: Export Resolved Profile… | Writes the effective profile for sharing/committing |

No `formatInteractively` or `readOnlyPreview` — out of scope per [01-scope.md](01-scope.md).

## Keybindings

Inherit `Shift+Alt+F` via the standard formatter contract. The upstream `Ctrl+4` / `Ctrl+5`
bindings are **not** contributed by default: `Ctrl+4`/`Ctrl+5` are unassigned in stock VS Code but
are widely remapped, and hijacking them from an extension is hostile. They are documented in the
README as an opt-in snippet instead.

## Capabilities

```jsonc
"capabilities": {
  "virtualWorkspaces": true,
  "untrustedWorkspaces": { "supported": true }
}
```

Both are `true` because the engine is pure TypeScript with no process spawning — a direct benefit
over the reference extension, which must declare `untrustedWorkspaces: false` and
`extensionKind: ["ui"]` because it launches a native executable. We omit `extensionKind`, so the
extension also runs in remote/WSL/Codespaces workspaces.

## Status bar

A status bar item shown for supported documents: rule-hit count for the active file, click →
`abapCleaner.showOutput`. Hidden when `abapCleaner.lint.enabled` is `false`.
