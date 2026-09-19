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

## Profile resolution is data-driven

`packages/vscode-extension/src/extension.ts` used to duplicate `engine.listRules()` as a hardcoded
`RULE_IDS` array plus a hand-maintained boolean expression encoding default/essential profile
membership per rule — a second source of truth that had already drifted from both the core rule
metadata (a newly ported rule could silently be unreachable via `abapCleaner.rules.<ID>.enabled`
until someone remembered to add it there too) and from upstream's actual `Rule.isEssential()`
overrides (several rules the Java essential profile activates, e.g. `COMMENT_TYPE` or
`CREATE_OBJECT`, were missing from the hand-written list, and the DDL rules were wrongly included).
`RuleMetadata.essentialEnabled` (ported from `Rule.isEssential()`) plus
`packages/core/src/profile-resolution.ts`'s `isRuleActiveInProfile()` now give a single,
core-owned, unit-tested source of truth; `extension.ts` iterates `engine.listRules()` directly for
`RULE_IDS`, per-rule setting names, and default/essential enablement instead of maintaining a
parallel list.

## Schema generation

These are **generated**, never hand-written: `tools/gen-settings-schema.mjs` calls
`engine.listRules()` and writes every `abapCleaner.rules.<ID>*` entry into
`packages/vscode-extension/package.json`'s `contributes.configuration.properties`, leaving the
non-rule settings (`abapCleaner.profile`, `lint.*`, `trace`, etc.) untouched. The mapping (shared
with the verifier via `tools/settings-schema.mjs`, so the two can never disagree with each other):

| Source | Target |
| --- | --- |
| `RuleMetadata.id` | Setting key segment |
| `RuleMetadata.displayName` | `markdownDescription` heading |
| `RuleMetadata.description` | `markdownDescription` body |
| `RuleMetadata.minimumAbapRelease` | Appended to `markdownDescription` |
| `RuleSettingMetadata.name` | Setting key segment |
| `RuleSettingMetadata.description` | `description` |
| `RuleSettingMetadata.minimum`/`maximum` | `minimum`/`maximum` (integer settings) |
| `RuleSettingMetadata.options` | `enum` (enum/selection settings) |

Not implemented, since no currently-ported rule's metadata exercises it: `RuleMetadata.groupId` as
an `order`/grouping hint in the settings UI, a `unit` appended to a setting's `description`, and
`enumDescriptions` for enum/selection settings.

`npm run gen:settings-schema` regenerates the file; `npm run verify:settings-schema` (run in CI, see
`tools/verify-settings-schema.mjs`) fails if the committed file differs from what the generator
would produce right now, so schema drift cannot be merged.

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
