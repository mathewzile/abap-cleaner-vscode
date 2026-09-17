import type { CleanupLanguage } from '../api.js';

const DDL_PREFIX = /^(?:@|\/\/|--|\/\*|(?:define\s+)?(?:root\s+)?(?:abstract|custom)\s+entity\b|(?:define\s+)?(?:root\s+)?view(?:\s+entity)?\b|define\s+table\s+function\b|define\s+hierarchy\b|define\s+transient\s+view\s+entity\b|extend\s+(?:abstract|custom)\s+entity\b|extend\s+view(?:\s+entity)?\b|annotate\s+(?:view|entity)\b|define\s+(?:structure|table)\b)/i;
const DCL_PREFIX = /^(?:define\s+)?(?:role|accesspolicy)\b/i;
const BDL_PREFIX = /^(?:managed|unmanaged|abstract;|projection;|interface;|projection\s+implementation)\b/i;
const DYNPRO_PREFIX = /^process\s+(?:before\s+output|after\s+input|on\s+(?:help-request|value-request))\b/i;

export function previewLanguage(sourceText: string): CleanupLanguage {
  let offset = 0;
  let fallback: CleanupLanguage = 'ABAP';

  while (offset < sourceText.length) {
    while (offset < sourceText.length && /[ \r\n]/.test(sourceText[offset]!)) {
      offset += 1;
    }
    if (offset >= sourceText.length) {
      return fallback;
    }
    if (sourceText.startsWith('//', offset)) {
      fallback = 'DDL';
      offset = skipLine(sourceText, offset);
      continue;
    }
    if (fallback === 'ABAP' && (sourceText[offset] === '*' || sourceText[offset] === '"')) {
      offset = skipLine(sourceText, offset);
      continue;
    }
    break;
  }

  const content = sourceText.slice(offset);
  if (BDL_PREFIX.test(content) || DYNPRO_PREFIX.test(content)) {
    return 'NOT_SUPPORTED';
  }
  if (DCL_PREFIX.test(content)) {
    return 'DCL';
  }
  if (DDL_PREFIX.test(content)) {
    return 'DDL';
  }
  return fallback;
}

function skipLine(text: string, offset: number): number {
  const lineEnd = text.indexOf('\n', offset);
  return lineEnd < 0 ? text.length : lineEnd + 1;
}
