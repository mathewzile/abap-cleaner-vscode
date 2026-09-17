import { readFile } from 'node:fs/promises';
import { TypeScriptCleanupEngine } from '../packages/core/dist/src/index.js';

const extensionManifest = JSON.parse(await readFile(new URL('../packages/vscode-extension/package.json', import.meta.url), 'utf8'));
const properties = extensionManifest.contributes?.configuration?.properties ?? {};
const rules = new TypeScriptCleanupEngine().listRules();
const missing = [];

for (const rule of rules) {
  const prefix = `abapCleaner.rules.${rule.id}`;
  if (!(prefix + '.enabled' in properties)) missing.push(prefix + '.enabled');
  for (const setting of rule.settings) {
    if (!(prefix + `.${setting.name}` in properties)) missing.push(prefix + `.${setting.name}`);
  }
}

if (missing.length > 0) {
  throw new Error(`Missing extension settings: ${missing.join(', ')}`);
}

console.log(`Verified extension settings for ${rules.length} core rules.`);