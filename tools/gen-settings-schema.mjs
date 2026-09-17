import { readFile, writeFile } from 'node:fs/promises';

const packageUrl = new URL('../packages/vscode-extension/package.json', import.meta.url);
const packageJson = JSON.parse(await readFile(packageUrl, 'utf8'));
await writeFile(packageUrl, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log('Settings schema generation is deferred until rule metadata is complete.');
