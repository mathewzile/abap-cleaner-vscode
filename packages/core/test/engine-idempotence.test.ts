import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { TypeScriptCleanupEngine } from '../src/index.js';

const engine = new TypeScriptCleanupEngine();

for (const fileName of ['cleanup-sample.abap', 'test-1-input.abap', 'test-2-input.abap'] as const) {
  test(`default cleanup is idempotent for ${fileName}`, async () => {
    const sourceText = await readFile(resolve(__dirname, '../../../../reference-eclipse-plugin/vscode-extension/samples', fileName), 'utf8');
    const once = engine.clean({
      sourceText,
      language: 'ABAP',
      expandMode: 'FULL_DOCUMENT',
      profile: { name: 'default', rules: {} },
      lineSeparator: sourceText.includes('\r\n') ? '\r\n' : '\n',
    }).cleanedCode!;
    const twice = engine.clean({
      sourceText: once,
      language: 'ABAP',
      expandMode: 'FULL_DOCUMENT',
      profile: { name: 'default', rules: {} },
      lineSeparator: once.includes('\r\n') ? '\r\n' : '\n',
    }).cleanedCode;
    assert.equal(twice, once);
  });
}

for (const fileName of ['cleanup-sample.acds'] as const) {
  test(`default cleanup is idempotent for ${fileName}`, async () => {
    const sourceText = await readFile(resolve(__dirname, '../../../../reference-eclipse-plugin/vscode-extension/samples', fileName), 'utf8');
    const once = engine.clean({
      sourceText,
      language: 'DDL',
      expandMode: 'FULL_DOCUMENT',
      profile: { name: 'default', rules: {} },
      lineSeparator: sourceText.includes('\r\n') ? '\r\n' : '\n',
    }).cleanedCode!;
    const twice = engine.clean({
      sourceText: once,
      language: 'DDL',
      expandMode: 'FULL_DOCUMENT',
      profile: { name: 'default', rules: {} },
      lineSeparator: once.includes('\r\n') ? '\r\n' : '\n',
    }).cleanedCode;
    assert.equal(twice, once);
    assert.notEqual(once, sourceText);
  });
}