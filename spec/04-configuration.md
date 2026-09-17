# 04 — Configuration: Profiles and Rules

## Model

Upstream `rulebase/Profile.java`: a profile is a named set of 100 entries, each `ruleID` →
`isActive` + that rule's settings. Persisted as `.cfj` text settings
(`REQUIRED_VERSION = 1`), with `autoActivateNewFeatures` (default `true`) controlling whether
rules added by a later version switch themselves on.

Built-in profiles:

| Name | Constant | Content |
|---|---|---|
| `default` | `Profile.DEFAULT_NAME` | Most rules active, upstream-recommended settings |
| `essential` | `Profile.ESSENTIAL_NAME` | Only rules explicitly demanded by the Clean ABAP styleguide (~40%) |

Both are shipped as generated JSON in `packages/core/resources/profiles/`.

## Resolution order

Settings compose; later wins.

```
built-in profile (default | essential)
  └─ external profile file (abapCleaner.profileUri, .cfj or .json)
       └─ abapCleaner.rules.<RULE_ID>.enabled
            └─ abapCleaner.rules.<RULE_ID>.<settingName>
```

The result is a `ResolvedProfile` — a flat, serializable object handed to the engine on every
call. VS Code's own folder/workspace/user settings precedence is inherited for free, which is how
per-project rule overrides work.

```ts
export interface ResolvedProfile {
  name: string;
  rules: Record<string, { enabled: boolean; settings: Record<string, boolean | number | string> }>;
}
```

## Settings surface

### Top-level

| Setting | Type | Default | Purpose |
|---|---|---|---|
| `abapCleaner.profile` | `"default" \| "essential" \| "custom"` | `"default"` | Base profile |
| `abapCleaner.profileUri` | `string` | `""` | Path/URI to a shared team profile (`.cfj` or `.json`). Required when `profile` is `"custom"` |
| `abapCleaner.abapRelease` | `string` | `""` | Restrict emitted syntax to an ABAP release, e.g. `"757"`. Empty = unrestricted |
| `abapCleaner.expandModeForSelection` | `ExpandMode` | `"FULL_METHOD"` | Matches `CleanupRangeExpandMode.getDefault()` |
| `abapCleaner.lint.enabled` | `boolean` | `true` | Publish diagnostics |
| `abapCleaner.lint.severity` | `"error" \| "warning" \| "information" \| "hint"` | `"information"` | Severity of cleanup diagnostics |
| `abapCleaner.lint.run` | `"onType" \| "onSave"` | `"onSave"` | When to recompute diagnostics |
| `abapCleaner.trace` | `"off" \| "messages" \| "verbose"` | `"off"` | Diagnostic logging |

### Per rule

Two shapes, both generated:

```jsonc
"abapCleaner.rules.NEEDLESS_SPACES.enabled": true,
"abapCleaner.rules.NEEDLESS_SPACES.searchAcrossLines": true
```

`.enabled` is `boolean | null`; `null` (the default) means "inherit from the profile", so an
untouched `settings.json` behaves exactly like the chosen profile. Same for each rule setting.
This three-state default is essential — a plain `false` default would silently disable every rule.

## Schema generation

100 rules with an average of 3–4 settings is ~350 configuration entries. These are **generated**,
never hand-written.

`tools/gen-settings-schema.ts` calls `engine.listRules()` and writes
`contributes.configuration` into `packages/vscode-extension/package.json`. The metadata comes from
what `Rule.java` and `ConfigValue.java` already expose:

| Source | Target |
|---|---|
| `RuleID.name()` | Setting key segment |
| `Rule.getDisplayName()` | `markdownDescription` heading |
| `Rule.getDescription()` | `markdownDescription` body |
| `Rule.getGroupID()` | `order` / grouping in the settings UI |
| `Rule.isActiveByDefault()` | Documented as the profile default |
| `ConfigValue.settingName` | Setting key segment |
| `ConfigValue.description` | `description` |
| `ConfigValue.unit` | Appended to `description` |
| `ConfigIntValue` min/max | `minimum` / `maximum` |
| `ConfigEnumValue` / `ConfigSelectionValue` | `enum` + `enumDescriptions` |
| `ConfigInfoValue` | **Skipped** — UI-only label, not a setting |
| `Rule.getRequiredAbapRelease()` | Appended to `markdownDescription` |

CI fails if the committed `package.json` differs from freshly generated output, so schema drift
cannot be merged.

## Team profiles

`Profile.loadProfiles()` supports read-only profile directories prefixed with `": "` for shared
team profiles. Ported as `abapCleaner.profileUri` pointing at a file that may live in the repo
(committed, so the whole team gets it) or on a shared drive. The `.cfj` reader is ported so
profiles exported from the Eclipse UI work unchanged — this is the main interop path for teams
already using ABAP cleaner.

## Interaction with `editor.defaultFormatter`

Users select `abapCleaner` as the default formatter per language, exactly as with Biome:

```jsonc
"[abap]": { "editor.defaultFormatter": "<publisher>.abap-cleaner-vscode" }
```

`editor.formatOnSave` then applies with no further configuration.
