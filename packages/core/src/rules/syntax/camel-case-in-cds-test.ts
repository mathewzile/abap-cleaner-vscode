const TESTING_ANNOTATION = /^\s*"!@testing\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/i;
const TEST_CLASS_DEFINITION = /^\s*CLASS\s+(ltc_[A-Za-z0-9_]+)\s+DEFINITION\b/i;
const TEST_CLASS_IMPLEMENTATION = /^\s*CLASS\s+([A-Za-z0-9_]+)\s+IMPLEMENTATION\b/i;

export function addNoWherePseudoCommentToSimpleCdsTestSelect(sourceText: string): string {
  const lines = sourceText.split(/(?<=\n)/);
  const result: string[] = [];
  let pendingTestingViewName: string | undefined;
  let annotatedTestingViewName: string | undefined;
  let annotatedTestClassName: string | undefined;
  let isInAnnotatedTestImplementation = false;

  for (const line of lines) {
    const content = line.replace(/\r?\n$/, '');
    const annotationMatch = TESTING_ANNOTATION.exec(content);
    const definitionMatch = TEST_CLASS_DEFINITION.exec(content);
    const implementationMatch = TEST_CLASS_IMPLEMENTATION.exec(content);
    if (annotationMatch !== null) pendingTestingViewName = annotationMatch[1];
    if (definitionMatch !== null) {
      annotatedTestClassName = pendingTestingViewName === undefined ? undefined : definitionMatch[1]!.toUpperCase();
      annotatedTestingViewName = pendingTestingViewName;
      pendingTestingViewName = undefined;
    } else if (implementationMatch !== null) {
      isInAnnotatedTestImplementation = implementationMatch[1]!.toUpperCase() === annotatedTestClassName;
    } else if (!/^\s*"!/.test(content)) {
      pendingTestingViewName = undefined;
    }
    result.push(isInAnnotatedTestImplementation && isSimpleSelectOf(content, annotatedTestingViewName)
      ? `${content} "#EC CI_NOWHERE${line.slice(content.length)}`
      : line);
    if (/^\s*ENDCLASS\s*\./i.test(content)) isInAnnotatedTestImplementation = false;
  }

  return result.join('');
}

function isSimpleSelectOf(line: string, viewName: string | undefined): boolean {
  return viewName !== undefined
    && !line.includes('"')
    && new RegExp(`^\\s*SELECT\\s+\\*\\s+FROM\\s+${viewName}\\s+INTO\\s+TABLE\\s+@[A-Za-z_][A-Za-z0-9_]*\\s*\\.\\s*$`, 'i').test(line);
}