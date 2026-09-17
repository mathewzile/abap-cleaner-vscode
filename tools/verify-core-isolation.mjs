import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const coreSourceRoot = new URL('../packages/core/src/', import.meta.url);
const sourceFiles = [];

async function collectSourceFiles(directoryUrl) {
  for (const entry of await readdir(directoryUrl, { withFileTypes: true })) {
    const entryUrl = new URL(entry.name, `${directoryUrl.href}/`);
    if (entry.isDirectory()) {
      await collectSourceFiles(entryUrl);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      sourceFiles.push(entryUrl);
    }
  }
}

await collectSourceFiles(coreSourceRoot);
const violations = [];

for (const sourceFile of sourceFiles) {
  const content = await readFile(sourceFile, 'utf8');
  if (/from\s+['"]vscode['"]|require\(['"]vscode['"]\)/.test(content)) {
    violations.push(sourceFile.pathname);
  }
}

if (violations.length > 0) {
  throw new Error(`packages/core must not import vscode:\n${violations.join('\n')}`);
}

console.log(`Verified ${sourceFiles.length} core TypeScript files have no vscode imports.`);
