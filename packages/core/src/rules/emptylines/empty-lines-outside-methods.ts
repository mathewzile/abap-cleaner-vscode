export interface EmptyLinesOutsideMethodsOptions {
  readonly emptyLinesBetweenClasses: number;
}

export function normalizeEmptyLinesOutsideMethods(
  sourceText: string,
  { emptyLinesBetweenClasses }: EmptyLinesOutsideMethodsOptions,
): string {
  return sourceText.replace(
    /(^[ \t]*END(?:CLASS|INTERFACE)\.[ \t]*)(\r?\n)(?:[ \t]*\r?\n)*([ \t]*(?:CLASS|INTERFACE)\b)/gim,
    (_match, closing: string, lineSeparator: string, opening: string) =>
      `${closing}${lineSeparator}${lineSeparator.repeat(emptyLinesBetweenClasses)}${opening}`,
  );
}