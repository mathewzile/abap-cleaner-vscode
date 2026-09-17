export function removeEmptyProtectedSectionsFromFinalLocalClasses(sourceText: string): string {
  const lines = sourceText.split(/\r?\n/);
  let inFinalLocalClass = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (isFinalLocalClassStart(line)) {
      inFinalLocalClass = true;
      continue;
    }
    if (/^\s*ENDCLASS\.$/i.test(line)) {
      inFinalLocalClass = false;
      continue;
    }
    if (!inFinalLocalClass || !/^\s*(?:PUBLIC|PROTECTED|PRIVATE)\s+SECTION\.$/i.test(line)) continue;
    if (sectionContainsOnlyBlankLines(lines, index + 1)) lines[index] = '';
  }
  return lines.join(sourceText.includes('\r\n') ? '\r\n' : '\n');
}

function isFinalLocalClassStart(line: string): boolean {
  return /^\s*CLASS\s+lcl_[A-Za-z0-9_]+\s+DEFINITION\b(?=.*\bFINAL\b)(?!.*\bDEFERRED\b).*\.$/i.test(line);
}

function sectionContainsOnlyBlankLines(lines: readonly string[], startIndex: number): boolean {
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (/^\s*$/.test(line)) continue;
    return /^\s*(?:PUBLIC|PROTECTED|PRIVATE)\s+SECTION\.$|^\s*ENDCLASS\.$/i.test(line);
  }
  return false;
}