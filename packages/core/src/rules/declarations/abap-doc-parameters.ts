const SIMPLE_DOCUMENTED_METHOD = /^(?<indent>[ \t]*)"! (?<header>[^\r\n]*)\r?\n\k<indent>METHODS [A-Za-z_][A-Za-z0-9_]* IMPORTING !?(?<parameter>[A-Za-z_][A-Za-z0-9_]*) TYPE [A-Za-z_][A-Za-z0-9_]*\.$/gim;

export function addSimpleMissingAbapDocParameters(sourceText: string): string {
  return sourceText.replace(SIMPLE_DOCUMENTED_METHOD, (match, indent: string, header: string, parameter: string) => {
    if (/synchronized|@parameter/i.test(header)) return match;
    const lineSeparator = match.includes('\r\n') ? '\r\n' : '\n';
    const methodIndex = match.lastIndexOf(`${lineSeparator}${indent}METHODS `);
    if (methodIndex < 0) return match;
    return `${match.slice(0, methodIndex)}${lineSeparator}${indent}"! @parameter ${parameter} |${match.slice(methodIndex)}`;
  });
}