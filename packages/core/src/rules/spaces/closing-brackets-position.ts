export function moveIsolatedClosingBracketsToPreviousLine(sourceText: string): string {
  const separator = sourceText.includes('\r\n') ? '\r\n' : '\n';
  const lines = sourceText.split(/\r?\n/);
  const result: string[] = [];
  for (const line of lines) {
    const closing = /^\s*([)\]])\s*(\.)?\s*$/.exec(line);
    const previous = result.at(-1);
    if (closing === null || previous === undefined || /^\s*$/.test(previous) || previous.includes('"')) {
      result.push(line);
    } else {
      result[result.length - 1] = `${previous.trimEnd()} ${closing[1]}${closing[2] ?? ''}`;
    }
  }
  return result.join(separator);
}