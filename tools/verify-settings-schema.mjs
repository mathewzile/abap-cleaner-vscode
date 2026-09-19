// CI check: fails if packages/vscode-extension/package.json's rule settings differ from what
// tools/gen-settings-schema.mjs would produce right now, so schema drift (a rule added without
// running the generator, or a hand-edited rule property) cannot be merged. Run
// `npm run gen:settings-schema` locally to fix a failure.
import { readFile } from 'node:fs/promises';
import { TypeScriptCleanupEngine } from '../packages/core/dist/src/index.js';
import { ruleProperties } from './settings-schema.mjs';

const packageUrl = new URL('../packages/vscode-extension/package.json', import.meta.url);
const extensionManifest = JSON.parse(await readFile(packageUrl, 'utf8'));
const properties = extensionManifest.contributes?.configuration?.properties ?? {};
const rules = new TypeScriptCleanupEngine().listRules();

const missing = [];
const mismatched = [];

for (const rule of rules) {
  for (const [key, expected] of Object.entries(ruleProperties(rule))) {
    if (!(key in properties)) {
      missing.push(key);
      continue;
    }
    if (JSON.stringify(properties[key]) !== JSON.stringify(expected)) mismatched.push(key);
  }
}

if (missing.length > 0 || mismatched.length > 0) {
  const parts = [];
  if (missing.length > 0) parts.push(`missing: ${missing.join(', ')}`);
  if (mismatched.length > 0) parts.push(`out of sync with the generator: ${mismatched.join(', ')}`);
  throw new Error(`Extension settings schema drift detected (${parts.join('; ')}). Run 'npm run gen:settings-schema' to fix.`);
}

console.log(`Verified extension settings for ${rules.length} core rules match the generator.`);
