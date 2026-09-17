import type { CleanupEngine } from './api.js';
import { TypeScriptCleanupEngine } from './typescript-engine.js';

export type CleanupEngineKind = 'typescript';

export function createCleanupEngine(kind: CleanupEngineKind = 'typescript'): CleanupEngine {
  if (kind === 'typescript') {
    return new TypeScriptCleanupEngine();
  }
  throw new Error(`Unsupported cleanup engine: ${kind}`);
}
