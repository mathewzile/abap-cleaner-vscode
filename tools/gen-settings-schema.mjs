// Generates packages/vscode-extension/package.json's `contributes.configuration.properties` for
// every `abapCleaner.rules.<ID>*` entry from `engine.listRules()`, per spec/04-configuration.md's
// "Schema generation" design. Non-rule settings (abapCleaner.profile, lint.*, trace, etc.) are
// hand-authored and left untouched. Run `npm run gen:settings-schema` after adding or changing a
// rule; `tools/verify-settings-schema.mjs` (run in CI) fails if the committed file drifts from
// this generator's output.
import { readFile, writeFile } from 'node:fs/promises';
import { TypeScriptCleanupEngine } from '../packages/core/dist/src/index.js';
import { ruleProperties } from './settings-schema.mjs';

const packageUrl = new URL('../packages/vscode-extension/package.json', import.meta.url);
const packageJson = JSON.parse(await readFile(packageUrl, 'utf8'));
const existingProperties = packageJson.contributes.configuration.properties;

const nonRuleProperties = {};
for (const [key, value] of Object.entries(existingProperties)) {
  if (!key.startsWith('abapCleaner.rules.')) nonRuleProperties[key] = value;
}

const rules = new TypeScriptCleanupEngine().listRules();
const generatedRuleProperties = Object.assign({}, ...rules.map(ruleProperties));

packageJson.contributes.configuration.properties = { ...nonRuleProperties, ...generatedRuleProperties };
await writeFile(packageUrl, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log(`Generated settings for ${Object.keys(generatedRuleProperties).length} rule properties across ${rules.length} rules.`);
