export function removeStandaloneEmptyCommands(sourceText: string): string {
  return sourceText.split(/(\r?\n)/).map((segment) => removeEmptyCommandLine(segment)).join('');
}

function removeEmptyCommandLine(line: string): string {
  const match = /^(\s*)[.,:]+(\s*)(".*)?$/.exec(line);
  if (match === null) return line;
  const indent = match[1] ?? '';
  const commentSpacing = match[2] ?? '';
  const comment = match[3];
  return comment === undefined ? '' : `${indent}${commentSpacing}${comment}`;
}