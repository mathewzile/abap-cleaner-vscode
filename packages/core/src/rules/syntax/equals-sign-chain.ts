const IDENTIFIER = '[A-Za-z_][A-Za-z0-9_]*';
const VALUE = `(?:${IDENTIFIER}|\\d+(?:\\.\\d+)?|'(?:''|[^'])*'|\`(?:\`\`|[^\`])*\`)`;
const CHAIN = new RegExp(`^(\\s*)((?:${IDENTIFIER}\\s*=\\s*){2,})(${VALUE})\\.\\s*$`);

export function splitSimpleEqualsSignChains(sourceText: string): string {
  return sourceText.split(/(\r?\n)/).map((segment) => splitEqualsSignChainLine(segment)).join('');
}

function splitEqualsSignChainLine(line: string): string {
  const match = CHAIN.exec(line);
  if (match === null) return line;
  const indent = match[1] ?? '';
  const assignments = match[2] ?? '';
  const value = match[3] ?? '';
  const leftSides = [...assignments.matchAll(new RegExp(`(${IDENTIFIER})\\s*=`, 'g'))].map((entry) => entry[1]!);
  if (leftSides.length < 2) return line;

  const commands: string[] = [];
  let rightSide = value;
  for (let index = leftSides.length - 1; index >= 0; index -= 1) {
    const leftSide = leftSides[index]!;
    commands.push(`${indent}${leftSide} = ${rightSide}.`);
    rightSide = leftSide;
  }
  return commands.join('\n');
}