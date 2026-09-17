const GENERATED_ABAP_DOC = new Set([
  '"! In CLASS_SETUP =  corresponding doubles and clone(s) for the CDS view under test and its dependencies are created.',
  '"! In CLASS_SETUP, corresponding doubles and clone(s) for the CDS view under test and its dependencies are created.',
  '"! In CLASS_TEARDOWN =  Generated database entities (doubles & clones) should be deleted at the end of test class execution.',
  '"! In CLASS_TEARDOWN, Generated database entities (doubles & clones) should be deleted at the end of test class execution.',
  '"! SETUP method creates a common start state for each test method =',
  '"! SETUP method creates a common start state for each test method,',
  '"! clear_doubles clears the test data for all the doubles used in the test method before each test method execution.',
  '"! In this method test data is inserted into the generated double(s) and the test is executed and',
  '"! the results should be asserted with the actuals.',
]);
const GENERATED_TODO = '" TODO: Provide the test data here';

export function removeGeneratedCdsTestClassAbapDoc(sourceText: string): string {
  const lines = sourceText.split(/(?<=\n)/);
  const result: string[] = [];
  let isInAnnotatedTestDefinition = false;
  let isInAnnotatedTestImplementation = false;
  let hasTestingAnnotation = false;
  let annotatedTestClassName: string | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const content = line.replace(/\r?\n$/, '');
    const definitionMatch = /^\s*CLASS\s+(ltc_[A-Za-z0-9_]+)\s+DEFINITION\b/i.exec(content);
    const implementationMatch = /^\s*CLASS\s+([A-Za-z0-9_]+)\s+IMPLEMENTATION\b/i.exec(content);
    if (/^\s*"!@testing\b/i.test(content)) hasTestingAnnotation = true;
    if (definitionMatch !== null) {
      isInAnnotatedTestDefinition = hasTestingAnnotation;
      if (hasTestingAnnotation) annotatedTestClassName = definitionMatch[1]!.toUpperCase();
      hasTestingAnnotation = false;
    } else if (implementationMatch !== null) {
      isInAnnotatedTestImplementation = implementationMatch[1]!.toUpperCase() === annotatedTestClassName;
    } else if (!/^\s*"!/.test(content)) {
      hasTestingAnnotation = false;
    }
    if (isInAnnotatedTestDefinition && GENERATED_ABAP_DOC.has(content.trim())) continue;
    if (isInAnnotatedTestImplementation && content.trim() === GENERATED_TODO && isSimplePopulatedValueAssignment(lines[index + 1])) continue;
    result.push(line);
    if (/^\s*ENDCLASS\s*\./i.test(content)) {
      isInAnnotatedTestDefinition = false;
      isInAnnotatedTestImplementation = false;
    }
  }

  return result.join('');
}

function isSimplePopulatedValueAssignment(line: string | undefined): boolean {
  return line !== undefined
    && !line.includes('"')
    && /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*VALUE\s*#\(\s*\(\s*[^\s)].*\)\s*\)\s*\.\s*$/i.test(line.replace(/\r?\n$/, ''));
}