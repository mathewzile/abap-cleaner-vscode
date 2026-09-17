export interface EmptyLinesInClassDefinitionOptions {
  readonly maxEmptyLines: number;
}

export function normalizeEmptyLinesInClassDefinition(
  sourceText: string,
  { maxEmptyLines }: EmptyLinesInClassDefinitionOptions,
): string {
  const lines = sourceText.split(/(?<=\n)/);
  const result: string[] = [];
  let isInClassDefinition = false;
  let emptyLineCount = 0;

  for (const line of lines) {
    const content = line.replace(/\r?\n$/, '');
    if (/^\s*CLASS\b.*\bDEFINITION\b/i.test(content) && !/\bDEFERRED\b/i.test(content)) {
      isInClassDefinition = true;
      emptyLineCount = 0;
    }
    if (isInClassDefinition && content.trim() === '') {
      emptyLineCount += 1;
      if (emptyLineCount > maxEmptyLines) continue;
    } else {
      emptyLineCount = 0;
    }
    result.push(line);
    if (/^\s*ENDCLASS\s*\./i.test(content)) isInClassDefinition = false;
  }

  return result.join('');
}