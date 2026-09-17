export interface EmptyLinesWithinMethodsOptions {
  readonly maxEmptyLinesWithinMethods: number;
}

export function normalizeEmptyLinesWithinMethods(
  sourceText: string,
  { maxEmptyLinesWithinMethods }: EmptyLinesWithinMethodsOptions,
): string {
  const lines = sourceText.split(/(?<=\n)/);
  const result: string[] = [];
  let isInMethod = false;
  let emptyLineCount = 0;

  for (const line of lines) {
    const content = line.replace(/\r?\n$/, '');
    if (/^\s*METHOD\s+/i.test(content)) {
      isInMethod = true;
      emptyLineCount = 0;
    }
    if (isInMethod && content.trim() === '') {
      emptyLineCount += 1;
      if (emptyLineCount > maxEmptyLinesWithinMethods) continue;
    } else {
      emptyLineCount = 0;
    }
    result.push(line);
    if (/^\s*ENDMETHOD\s*\./i.test(content)) isInMethod = false;
  }

  return result.join('');
}