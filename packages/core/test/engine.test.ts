import assert from 'node:assert/strict';
import test from 'node:test';

import { TypeScriptCleanupEngine, type CleanupRequest } from '../src/index.js';

const DEFAULT_REQUEST: Omit<CleanupRequest, 'sourceText'> = {
  expandMode: 'FULL_DOCUMENT',
  profile: { name: 'default', rules: {} },
  lineSeparator: '\n',
};

test('the engine applies the enabled ABAP spacing rules', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: '  DATA value TYPE i ."comment',
  });

  assert.equal(response.cleanedCode, '  DATA value TYPE i. " comment');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['SPACE_BEFORE_PERIOD', 'SPACE_AROUND_COMMENT_SIGN']);
  assert.deepEqual(response.appliedRules.map((rule) => [rule.startLine, rule.endLine]), [[1, 1], [1, 1]]);
  assert.equal(response.stats.changedLineCount, 1);
});

test('the engine moves isolated closing brackets to the prior code line', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'any_method(\n  iv_value = value\n).',
    profile: { name: 'custom', rules: { CLOSING_BRACKETS_POSITION: { enabled: true, settings: {} } } },
  });

  assert.equal(response.cleanedCode, 'any_method(\n  iv_value = value ).');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['CLOSING_BRACKETS_POSITION']);
});

test('reports the line range changed by each rule', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'WRITE first.\nWRITE second .',
  });

  assert.deepEqual(response.appliedRules.map(ruleSummary), [{
    ruleId: 'SPACE_BEFORE_PERIOD', displayName: 'Remove space before commas and period', startLine: 2, endLine: 2,
  }]);
  assert.deepEqual(response.appliedRules.map((rule) => [rule.startColumn, rule.endColumn]), [[12, 13]]);
});

test('the engine applies empty-line cleanup with the default profile', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: '  METHOD run.\n\n\n    WRITE value.\n  ENDMETHOD.',
  });

  assert.equal(response.cleanedCode, '  METHOD run.\n\n    WRITE value.\n  ENDMETHOD.');
  assert.deepEqual(response.appliedRules.map(ruleSummary), [{
    ruleId: 'EMPTY_LINES_WITHIN_METHODS',
    displayName: 'Standardize empty lines within methods',
    startLine: 3,
    endLine: 3,
  }]);
});

test('command-per-line cleanup requires an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = '  DATA lv_first TYPE i. DATA lv_second TYPE i.';
  const defaultResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText });
  const enabledResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { ONE_COMMAND_PER_LINE: { enabled: true, settings: {} } } },
  });

  assert.equal(defaultResponse.cleanedCode, sourceText);
  assert.equal(enabledResponse.cleanedCode, '  DATA lv_first  TYPE i.\n  DATA lv_second TYPE i.');
  assert.deepEqual(enabledResponse.appliedRules.map((rule) => rule.ruleId), ['ONE_COMMAND_PER_LINE', 'ALIGN_DECLARATIONS']);
});

test('the engine applies bounded CALL METHOD modernization', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'CALL METHOD run( iv_id = id ).',
  });

  assert.equal(response.cleanedCode, 'run( iv_id = id ).');
  assert.deepEqual(response.appliedRules.map(ruleSummary), [{
    ruleId: 'CALL_METHOD',
    displayName: 'Replace CALL METHOD with functional call',
    startLine: 1,
    endLine: 1,
  }]);

  const exportingResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'CALL METHOD run EXPORTING id = value.',
  });
  assert.equal(exportingResponse.cleanedCode, 'run( id = value ).');
  assert.deepEqual(exportingResponse.appliedRules.map((rule) => rule.ruleId), ['CALL_METHOD']);
});

test('the engine applies bounded RECEIVING keyword modernization', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'get_value( RECEIVING result = value ).',
  });

  assert.equal(response.cleanedCode, 'value = get_value( ).');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['RECEIVING_KEYWORD']);
});

test('the engine removes synchronized ABAP Doc English language attributes', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: '"! <p class="shorttext synchronized" lang="en">Documentation</p>',
  });

  assert.equal(response.cleanedCode, '"! <p class="shorttext synchronized">Documentation</p>');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['ABAP_DOC_LANG']);
});

test('ABAP Doc parameter insertion requires an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = '"! Calculates an item total\nMETHODS calculate IMPORTING iv_count TYPE i.';
  const defaultResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText });
  const enabledResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { ABAP_DOC_PARAMETERS: { enabled: true, settings: {} } } },
  });

  assert.equal(defaultResponse.cleanedCode, sourceText);
  assert.equal(enabledResponse.cleanedCode, '"! Calculates an item total\n"! @parameter iv_count |\nMETHODS calculate IMPORTING iv_count TYPE i.');
  assert.deepEqual(enabledResponse.appliedRules.map((rule) => rule.ruleId), ['ABAP_DOC_PARAMETERS']);
});

test('the engine makes a simple implicit DATA type explicit', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({ ...DEFAULT_REQUEST, sourceText: 'DATA lv_text(30).' });

  assert.equal(response.cleanedCode, 'DATA lv_text TYPE c LENGTH 30.');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['IMPLICIT_TYPE']);

  const typeResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText: 'TYPES ty_text(30).' });
  assert.equal(typeResponse.cleanedCode, 'TYPES ty_text TYPE c LENGTH 30.');
  assert.deepEqual(typeResponse.appliedRules.map((rule) => rule.ruleId), ['IMPLICIT_TYPE']);

  const untypedResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText: 'DATA lv_flag.' });
  assert.equal(untypedResponse.cleanedCode, 'DATA lv_flag TYPE c.');
  assert.deepEqual(untypedResponse.appliedRules.map((rule) => rule.ruleId), ['IMPLICIT_TYPE']);
});

test('the engine removes an initial CLEAR after a scalar declaration', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({ ...DEFAULT_REQUEST, sourceText: 'DATA lv_count TYPE i.\nCLEAR lv_count.\nwork( ).' });

  assert.equal(response.cleanedCode, 'DATA lv_count TYPE i.\n\nwork( ).');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['NEEDLESS_CLEAR']);
});

test('parameter escape cleanup requires an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'METHODS run IMPORTING !iv_count TYPE i.';
  const defaultResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText });
  const enabledResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { ESCAPE_CHAR_FOR_PARAMS: { enabled: true, settings: {} } } },
  });

  assert.equal(defaultResponse.cleanedCode, sourceText);
  assert.equal(enabledResponse.cleanedCode, 'METHODS run IMPORTING iv_count TYPE i.');
  assert.deepEqual(enabledResponse.appliedRules.map((rule) => rule.ruleId), ['ESCAPE_CHAR_FOR_PARAMS']);

  const criticalResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'METHODS run IMPORTING optional TYPE i.',
    profile: { name: 'custom', rules: { ESCAPE_CHAR_FOR_PARAMS: { enabled: true, settings: {} } } },
  });
  assert.equal(criticalResponse.cleanedCode, 'METHODS run IMPORTING !optional TYPE i.');
  assert.deepEqual(criticalResponse.appliedRules.map((rule) => rule.ruleId), ['ESCAPE_CHAR_FOR_PARAMS']);
});

test('declaration chain cleanup requires an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'DATA: lv_count TYPE i, lv_text TYPE string.';
  const defaultResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText });
  const enabledResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { DECLARATION_CHAIN: { enabled: true, settings: {} } } },
  });

  assert.equal(defaultResponse.cleanedCode, sourceText);
  assert.equal(enabledResponse.cleanedCode, 'DATA lv_count TYPE i.\nDATA lv_text  TYPE string.');
  assert.deepEqual(enabledResponse.appliedRules.map((rule) => rule.ruleId), ['DECLARATION_CHAIN', 'ALIGN_DECLARATIONS']);
});

test('empty protected section cleanup requires an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'CLASS lcl_example DEFINITION FINAL.\n  PROTECTED SECTION.\nENDCLASS.';
  const defaultResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText });
  const enabledResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { EMPTY_SECTIONS: { enabled: true, settings: {} } } },
  });

  assert.equal(defaultResponse.cleanedCode, sourceText);
  assert.equal(enabledResponse.cleanedCode, 'CLASS lcl_example DEFINITION FINAL.\n\nENDCLASS.');
  assert.deepEqual(enabledResponse.appliedRules.map((rule) => rule.ruleId), ['EMPTY_SECTIONS']);
});

test('class definition option ordering requires an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'CLASS lcl_item DEFINITION FINAL PUBLIC.';
  const defaultResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText });
  const enabledResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { CLASS_DEFINITION: { enabled: true, settings: {} } } },
  });

  assert.equal(defaultResponse.cleanedCode, sourceText);
  assert.equal(enabledResponse.cleanedCode, 'CLASS lcl_item DEFINITION PUBLIC FINAL.');
  assert.deepEqual(enabledResponse.appliedRules.map((rule) => rule.ruleId), ['CLASS_DEFINITION']);
});

test('pseudo-comment modernization requires ABAP release 7.02', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'DATA value TYPE string. "#EC NEEDED';
  const oldRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, abapRelease: '701' });
  const supportedRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, abapRelease: '702' });

  assert.equal(oldRelease.cleanedCode, sourceText);
  assert.equal(supportedRelease.cleanedCode, 'DATA value TYPE string ##NEEDED.');
  assert.deepEqual(supportedRelease.appliedRules.map((rule) => rule.ruleId), ['PSEUDO_COMMENT']);
});

test('the engine applies bounded MOVE TO modernization', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'MOVE value TO result.',
  });

  assert.equal(response.cleanedCode, 'result = value.');
  assert.deepEqual(response.appliedRules.map(ruleSummary), [{
    ruleId: 'MOVE_TO',
    displayName: 'Replace obsolete MOVE TO with =',
    startLine: 1,
    endLine: 1,
  }]);
});

test('the engine removes standalone empty commands by default', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'WRITE value.\n...\nWRITE next.',
  });

  assert.equal(response.cleanedCode, 'WRITE value.\n\nWRITE next.');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['EMPTY_COMMAND']);
});

test('the engine splits simple equals-sign chains by default', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'first = second = value.',
  });

  assert.equal(response.cleanedCode, 'second = value.\nfirst = second.');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['EQUALS_SIGN_CHAIN']);
});

test('the engine replaces EXIT outside an enclosing loop', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'METHOD run.\n  IF failed = abap_true.\n    EXIT.\n  ENDIF.\nENDMETHOD.',
  });

  assert.equal(response.cleanedCode, 'METHOD run.\n  IF failed = abap_true.\n    RETURN.\n  ENDIF.\nENDMETHOD.');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['EXIT_OUTSIDE_LOOP']);
});

test('method-end IF conversion requires an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'METHOD run.\n  IF iv_ready IS INITIAL.\n    WRITE iv_ready.\n  ENDIF.\nENDMETHOD.';
  const defaultResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText });
  const enabledResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { IF_BLOCK_AT_METHOD_END: { enabled: true, settings: {} } } },
  });

  assert.equal(defaultResponse.cleanedCode, sourceText);
  assert.equal(enabledResponse.cleanedCode, 'METHOD run.\n  IF iv_ready IS NOT INITIAL.\n    RETURN.\n  ENDIF.\n  WRITE iv_ready.\nENDMETHOD.');
  assert.deepEqual(enabledResponse.appliedRules.map((rule) => rule.ruleId), ['IF_BLOCK_AT_METHOD_END']);
});

test('loop-end IF conversion requires an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'LOOP AT lt_items.\n  IF ls_item IS INITIAL.\n    WRITE ls_item.\n  ENDIF.\nENDLOOP.';
  const defaultResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText });
  const enabledResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { IF_BLOCK_AT_LOOP_END: { enabled: true, settings: {} } } },
  });

  assert.equal(defaultResponse.cleanedCode, sourceText);
  assert.equal(enabledResponse.cleanedCode, 'LOOP AT lt_items.\n  IF ls_item IS NOT INITIAL.\n    CONTINUE.\n  ENDIF.\n  WRITE ls_item.\nENDLOOP.');
  assert.deepEqual(enabledResponse.appliedRules.map((rule) => rule.ruleId), ['IF_BLOCK_AT_LOOP_END']);
});

test('CDS test-class ABAP Doc cleanup requires an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = '"!@testing I_SalesOrder\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\n  "! In CLASS_SETUP, corresponding doubles and clone(s) for the CDS view under test and its dependencies are created.\n  CLASS-METHODS class_setup.\nENDCLASS.';
  const defaultResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText });
  const enabledResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { CDS_TEST_CLASS_LINES: { enabled: true, settings: {} } } },
  });

  assert.equal(defaultResponse.cleanedCode, sourceText);
  assert.equal(enabledResponse.cleanedCode, '"!@testing I_SalesOrder\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\n  CLASS-METHODS class_setup.\nENDCLASS.');
  assert.deepEqual(enabledResponse.appliedRules.map((rule) => rule.ruleId), ['CDS_TEST_CLASS_LINES']);
});

test('CDS test SELECT pseudo-comment requires an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = '"!@testing I_SalesOrder\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\nENDCLASS.\nCLASS ltc_sales_order IMPLEMENTATION.\n  SELECT * FROM I_SalesOrder INTO TABLE @lt_results.\nENDCLASS.';
  const defaultResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { EMPTY_LINES_OUTSIDE_METHODS: { enabled: false, settings: {} } } },
  });
  const enabledResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: {
      name: 'custom',
      rules: {
        CAMEL_CASE_IN_CDS_TEST: { enabled: true, settings: {} },
        EMPTY_LINES_OUTSIDE_METHODS: { enabled: false, settings: {} },
      },
    },
  });

  assert.equal(defaultResponse.cleanedCode, sourceText);
  assert.equal(enabledResponse.cleanedCode, '"!@testing I_SalesOrder\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\nENDCLASS.\nCLASS ltc_sales_order IMPLEMENTATION.\n  SELECT * FROM I_SalesOrder INTO TABLE @lt_results. "#EC CI_NOWHERE\nENDCLASS.');
  assert.deepEqual(enabledResponse.appliedRules.map((rule) => rule.ruleId), ['CAMEL_CASE_IN_CDS_TEST']);
});

test('the engine converts supported CHECK statements outside loops', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'METHOD run.\n  CHECK lv_ready IS NOT INITIAL.\nENDMETHOD.',
  });

  assert.equal(response.cleanedCode, 'METHOD run.\n  IF lv_ready IS INITIAL.\n    RETURN.\n  ENDIF.\nENDMETHOD.');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['CHECK_OUTSIDE_LOOP']);
});

test('the engine converts supported CHECK statements in loops', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'LOOP AT values INTO value.\n  CHECK value IS NOT INITIAL.\nENDLOOP.',
  });

  assert.equal(response.cleanedCode, 'LOOP AT values INTO value.\n  IF value IS INITIAL.\n    CONTINUE.\n  ENDIF.\nENDLOOP.');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['CHECK_IN_LOOP']);
});

test('the engine removes exact redundant method end comments', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'METHOD run.\nENDMETHOD. " run',
  });

  assert.equal(response.cleanedCode, 'METHOD run.\nENDMETHOD.');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['END_OF_COMMENT']);
});

test('the engine moves terminal logical operators by default', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'IF iv_active = abap_true AND\n   iv_ready = abap_true.',
  });

  assert.equal(response.cleanedCode, 'IF iv_active = abap_true\n   AND iv_ready = abap_true.');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['LOGICAL_OPERATOR_POSITION']);
});

test('the engine removes self references from direct method calls by default', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({ ...DEFAULT_REQUEST, sourceText: 'lv_total = me->get_total( ).' });

  assert.equal(response.cleanedCode, 'lv_total = get_total( ).');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['SELF_REFERENCE_ME']);
});

test('READ TABLE modernization requires ABAP 7.40', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'READ TABLE lt_items WITH KEY id = iv_id ASSIGNING <ls_item>.';
  const oldRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, abapRelease: '731' });
  const supportedRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, abapRelease: '740' });

  assert.equal(oldRelease.cleanedCode, sourceText);
  assert.equal(supportedRelease.cleanedCode, 'ASSIGN lt_items[ id = iv_id ] TO <ls_item>.');
  assert.deepEqual(supportedRelease.appliedRules.map((rule) => rule.ruleId), ['READ_TABLE']);
});

test('VALUE statement shortening requires an explicit release-compatible profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = "lt_items = VALUE #( ( category = 'A' id = 1 ) ( category = 'A' id = 2 ) ).";
  const profile = { name: 'custom', rules: { VALUE_STATEMENT: { enabled: true, settings: {} } } };
  const oldRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, profile, abapRelease: '731' });
  const supportedRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, profile, abapRelease: '740' });

  assert.equal(oldRelease.cleanedCode, sourceText);
  assert.equal(supportedRelease.cleanedCode, "lt_items = VALUE #( category = 'A' ( id = 1 ) ( id = 2 ) ).");
  assert.deepEqual(supportedRelease.appliedRules.map((rule) => rule.ruleId), ['VALUE_STATEMENT']);
});

test('the engine removes simple needless logical parentheses before CHECK conversion', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'METHOD run.\n  CHECK ( lv_ready IS NOT INITIAL ).\nENDMETHOD.',
  });

  assert.equal(response.cleanedCode, 'METHOD run.\n  IF lv_ready IS INITIAL.\n    RETURN.\n  ENDIF.\nENDMETHOD.');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['NEEDLESS_PARENTHESES', 'CHECK_OUTSIDE_LOOP']);
});

test('the engine moves a supported trailing pragma before its period', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'DATA value TYPE string. ##NEEDED\n',
  });

  assert.equal(response.cleanedCode, 'DATA value TYPE string ##NEEDED.\n');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['PRAGMA_POSITION']);
});

test('the engine corrects supported typos in comments without changing literals', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: "value = 'additonal'. \" additonal",
  });

  assert.equal(response.cleanedCode, "value = 'additonal'. \" additional");
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['TYPO']);
});

test('prose asterisk comment conversion requires an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = '* Explain the following calculation';
  const defaultResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText });
  const enabledResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { COMMENT_TYPE: { enabled: true, settings: {} } } },
  });

  assert.equal(defaultResponse.cleanedCode, sourceText);
  assert.equal(enabledResponse.cleanedCode, '" Explain the following calculation');
  assert.deepEqual(enabledResponse.appliedRules.map((rule) => rule.ruleId), ['COMMENT_TYPE']);
});

test('statement keyword casing requires an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'if lv_ready = abap_true.\nendif.';
  const defaultResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText });
  const enabledResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { UPPER_AND_LOWER_CASE: { enabled: true, settings: {} } } },
  });

  assert.equal(defaultResponse.cleanedCode, sourceText);
  assert.equal(enabledResponse.cleanedCode, 'IF lv_ready = abap_true.\nENDIF.');
  assert.deepEqual(enabledResponse.appliedRules.map((rule) => rule.ruleId), ['UPPER_AND_LOWER_CASE']);
});

test('TRANSLATE modernization requires a release-compatible explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'DATA lv_text TYPE string.\nTRANSLATE lv_text TO UPPER CASE.';
  const profile = { name: 'custom', rules: { TRANSLATE: { enabled: true, settings: {} } } };
  const oldRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, profile, abapRelease: '701' });
  const supportedRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, profile, abapRelease: '702' });

  assert.equal(oldRelease.cleanedCode, sourceText);
  assert.equal(supportedRelease.cleanedCode, 'DATA lv_text TYPE string.\nlv_text = to_upper( lv_text ).');
  assert.deepEqual(supportedRelease.appliedRules.map((rule) => rule.ruleId), ['TRANSLATE']);
});

test('STRING_TEMPLATE modernization requires ABAP release 7.02', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'lv_text = `Hello ` && iv_name.';
  const oldRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, abapRelease: '701' });
  const supportedRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, abapRelease: '702' });

  assert.equal(oldRelease.cleanedCode, sourceText);
  assert.equal(supportedRelease.cleanedCode, 'lv_text = |Hello { iv_name }|.');
  assert.deepEqual(supportedRelease.appliedRules.map((rule) => rule.ruleId), ['STRING_TEMPLATE']);

  const reverseResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText: 'lv_text = iv_name && `!`.', abapRelease: '702' });
  assert.equal(reverseResponse.cleanedCode, 'lv_text = |{ iv_name }!|.');
  assert.deepEqual(reverseResponse.appliedRules.map((rule) => rule.ruleId), ['STRING_TEMPLATE']);

  const literalsResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText: 'lv_text = `Hello` && ` world`.', abapRelease: '702' });
  assert.equal(literalsResponse.cleanedCode, 'lv_text = |Hello world|.');
  assert.deepEqual(literalsResponse.appliedRules.map((rule) => rule.ruleId), ['STRING_TEMPLATE']);
});

test('CONDENSE modernization requires a release-compatible explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'DATA lv_text TYPE string.\nCONDENSE lv_text.';
  const profile = { name: 'custom', rules: { CONDENSE: { enabled: true, settings: {} } } };
  const oldRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, profile, abapRelease: '701' });
  const supportedRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, profile, abapRelease: '702' });

  assert.equal(oldRelease.cleanedCode, sourceText);
  assert.equal(supportedRelease.cleanedCode, 'DATA lv_text TYPE string.\nlv_text = condense( lv_text ).');
  assert.deepEqual(supportedRelease.appliedRules.map((rule) => rule.ruleId), ['CONDENSE']);
});

test('DESCRIBE TABLE modernization requires an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'DESCRIBE TABLE lt_items LINES lv_count.\nRETURN.';
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { DESCRIBE_TABLE: { enabled: true, settings: {} } } },
  });

  assert.equal(response.cleanedCode, 'lv_count = lines( lt_items ).\nRETURN.');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['DESCRIBE_TABLE']);
});

test('ASSERT_CLASS modernization requires an explicit profile override and uses its class setting', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'ASSERT lo_item IS BOUND.',
    profile: { name: 'custom', rules: { ASSERT_CLASS: { enabled: true, settings: { assertClassName: 'cx_product_assert' } } } },
  });

  assert.equal(response.cleanedCode, 'cx_product_assert=>assert_bound( lo_item ).');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['ASSERT_CLASS']);

  const equalityResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'ASSERT lv_actual = `expected`.',
    profile: { name: 'custom', rules: { ASSERT_CLASS: { enabled: true, settings: { assertClassName: 'cx_product_assert' } } } },
  });
  assert.equal(equalityResponse.cleanedCode, 'cx_product_assert=>assert_equals( act = lv_actual exp = `expected` ).');
  assert.deepEqual(equalityResponse.appliedRules.map((rule) => rule.ruleId), ['ASSERT_CLASS']);

  const booleanResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'ASSERT lv_ready = abap_true.',
    profile: { name: 'custom', rules: { ASSERT_CLASS: { enabled: true, settings: { assertClassName: 'cx_product_assert' } } } },
  });
  assert.equal(booleanResponse.cleanedCode, 'cx_product_assert=>assert_true( lv_ready ).');
  assert.deepEqual(booleanResponse.appliedRules.map((rule) => rule.ruleId), ['ASSERT_CLASS']);

  const subrcResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'ASSERT sy-subrc = 0.',
    profile: { name: 'custom', rules: { ASSERT_CLASS: { enabled: true, settings: { assertClassName: 'cx_product_assert' } } } },
  });
  assert.equal(subrcResponse.cleanedCode, 'cx_product_assert=>assert_subrc().');
  assert.deepEqual(subrcResponse.appliedRules.map((rule) => rule.ruleId), ['ASSERT_CLASS']);

  const differsResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'ASSERT lv_actual <> lv_expected.',
    profile: { name: 'custom', rules: { ASSERT_CLASS: { enabled: true, settings: { assertClassName: 'cx_product_assert' } } } },
  });
  assert.equal(differsResponse.cleanedCode, 'cx_product_assert=>assert_differs( act = lv_actual exp = lv_expected ).');
  assert.deepEqual(differsResponse.appliedRules.map((rule) => rule.ruleId), ['ASSERT_CLASS']);
});

test('the engine standardizes supported scalar assertion parameter order', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'cl_abap_unit_assert=>assert_equals( act = actual exp = expected ).',
  });

  assert.equal(response.cleanedCode, 'cl_abap_unit_assert=>assert_equals( exp = expected act = actual ).');
  assert.deepEqual(response.appliedRules.map((rule) => rule.ruleId), ['ASSERT_PARAMETER_ORDER']);
});

test('the engine applies bounded boolean assertion modernization', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'cl_abap_unit_assert=>assert_equals( act = value exp = abap_true ).',
  });

  assert.equal(response.cleanedCode, 'cl_abap_unit_assert=>assert_true( value ).');
  assert.deepEqual(response.appliedRules.map(ruleSummary), [{
    ruleId: 'ASSERT_PARAMETER_ORDER',
    displayName: 'Standardize assertion parameter order',
    startLine: 1,
    endLine: 1,
  }, {
    ruleId: 'ASSERT_EQUALS_BOOLEAN',
    displayName: 'Use assert_true and assert_false',
    startLine: 1,
    endLine: 1,
  }]);

  const functionalResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'cl_abap_unit_assert=>assert_equals( act = get_value( ) exp = abap_true ).',
  });
  assert.equal(functionalResponse.cleanedCode, 'cl_abap_unit_assert=>assert_true( get_value( ) ).');
  assert.deepEqual(functionalResponse.appliedRules.map((rule) => rule.ruleId), ['ASSERT_EQUALS_BOOLEAN']);
});

test('the engine applies bounded subrc assertion modernization', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'cl_abap_unit_assert=>assert_equals( act = sy-subrc exp = 0 ).',
  });

  assert.equal(response.cleanedCode, 'cl_abap_unit_assert=>assert_subrc( ).');
  assert.deepEqual(response.appliedRules.map(ruleSummary), [{
    ruleId: 'ASSERT_PARAMETER_ORDER',
    displayName: 'Standardize assertion parameter order',
    startLine: 1,
    endLine: 1,
  }, {
    ruleId: 'ASSERT_EQUALS_SUBRC',
    displayName: 'Use assert_subrc instead of assert_equals',
    startLine: 1,
    endLine: 1,
  }]);

  const nonzeroResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'cl_abap_unit_assert=>assert_equals( act = sy-subrc exp = 4 ).',
  });
  assert.equal(nonzeroResponse.cleanedCode, 'cl_abap_unit_assert=>assert_subrc( exp = 4 ).');
  assert.deepEqual(nonzeroResponse.appliedRules.map((rule) => rule.ruleId), ['ASSERT_PARAMETER_ORDER', 'ASSERT_EQUALS_SUBRC']);
});

test('calculation assignments require an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'lv_value = lv_value + 1.';
  const defaultResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText });
  const enabledResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { CALCULATION_ASSIGNMENT: { enabled: true, settings: {} } } },
  });

  assert.equal(defaultResponse.cleanedCode, sourceText);
  assert.equal(enabledResponse.cleanedCode, 'lv_value += 1.');
  assert.deepEqual(enabledResponse.appliedRules.map((rule) => rule.ruleId), ['CALCULATION_ASSIGNMENT']);
});

test('ADD TO ETC modernization requires release 7.54 and an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'ADD 1 TO lv_total.';
  const profile = { name: 'custom', rules: { ADD_TO_ETC: { enabled: true, settings: {} } } };
  const oldRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, profile, abapRelease: '753' });
  const supportedRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, profile, abapRelease: '754' });

  assert.equal(oldRelease.cleanedCode, sourceText);
  assert.equal(supportedRelease.cleanedCode, 'lv_total += 1.');
  assert.deepEqual(supportedRelease.appliedRules.map((rule) => rule.ruleId), ['ADD_TO_ETC']);
});

test('CREATE OBJECT modernization requires an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'CREATE OBJECT lo_instance TYPE cl_example.';
  const defaultResponse = engine.clean({ ...DEFAULT_REQUEST, sourceText });
  const enabledResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText,
    profile: { name: 'custom', rules: { CREATE_OBJECT: { enabled: true, settings: {} } } },
  });

  assert.equal(defaultResponse.cleanedCode, sourceText);
  assert.equal(enabledResponse.cleanedCode, 'lo_instance = NEW cl_example( ).');
  assert.deepEqual(enabledResponse.appliedRules.map((rule) => rule.ruleId), ['CREATE_OBJECT']);
});

test('release-sensitive rules do not apply below their minimum ABAP release', () => {
  const engine = new TypeScriptCleanupEngine();
  const profile = {
    name: 'custom',
    rules: {
      CALCULATION_ASSIGNMENT: { enabled: true, settings: {} },
      CREATE_OBJECT: { enabled: true, settings: {} },
    },
  };
  const sourceText = 'lv_value = lv_value + 1.\nCREATE OBJECT lo_instance TYPE cl_example.';
  const response = engine.clean({ ...DEFAULT_REQUEST, sourceText, profile, abapRelease: '731' });

  assert.equal(response.cleanedCode, sourceText);
  assert.deepEqual(response.appliedRules, []);
});

test('release-sensitive rules apply at their minimum ABAP release', () => {
  const engine = new TypeScriptCleanupEngine();
  const createResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'CREATE OBJECT lo_instance TYPE cl_example.',
    abapRelease: '740',
    profile: { name: 'custom', rules: { CREATE_OBJECT: { enabled: true, settings: {} } } },
  });
  const calculationResponse = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'lv_value = lv_value + 1.',
    abapRelease: '754',
    profile: { name: 'custom', rules: { CALCULATION_ASSIGNMENT: { enabled: true, settings: {} } } },
  });

  assert.equal(createResponse.cleanedCode, 'lo_instance = NEW cl_example( ).');
  assert.equal(calculationResponse.cleanedCode, 'lv_value += 1.');
});

test('RAISE TYPE modernization requires release 7.52 and an explicit profile override', () => {
  const engine = new TypeScriptCleanupEngine();
  const sourceText = 'RAISE EXCEPTION TYPE cx_example.';
  const profile = { name: 'custom', rules: { RAISE_TYPE: { enabled: true, settings: {} } } };
  const oldRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, profile, abapRelease: '751' });
  const supportedRelease = engine.clean({ ...DEFAULT_REQUEST, sourceText, profile, abapRelease: '752' });

  assert.equal(oldRelease.cleanedCode, sourceText);
  assert.equal(supportedRelease.cleanedCode, 'RAISE EXCEPTION NEW cx_example( ).');
  assert.deepEqual(supportedRelease.appliedRules.map((rule) => rule.ruleId), ['RAISE_TYPE']);
});

test('the profile can disable a rule independently', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'CLEAR value .',
    profile: {
      name: 'custom',
      rules: {
        SPACE_BEFORE_PERIOD: { enabled: false, settings: {} },
      },
    },
  });

  assert.equal(response.cleanedCode, 'CLEAR value .');
  assert.equal(engine.listRules().length, 93);
});

test('the profile can disable CALL METHOD modernization independently', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'CALL METHOD run( iv_id = id ).',
    profile: {
      name: 'custom',
      rules: {
        CALL_METHOD: { enabled: false, settings: {} },
      },
    },
  });

  assert.equal(response.cleanedCode, 'CALL METHOD run( iv_id = id ).');
  assert.deepEqual(response.appliedRules, []);
});

test('the profile can disable assertion modernizations independently', () => {
  const engine = new TypeScriptCleanupEngine();
  const response = engine.clean({
    ...DEFAULT_REQUEST,
    sourceText: 'cl_abap_unit_assert=>assert_equals( exp = abap_true act = value ).\ncl_abap_unit_assert=>assert_equals( exp = 0 act = sy-subrc ).',
    profile: {
      name: 'custom',
      rules: {
        ASSERT_EQUALS_BOOLEAN: { enabled: false, settings: {} },
        ASSERT_EQUALS_SUBRC: { enabled: false, settings: {} },
      },
    },
  });

  assert.equal(response.cleanedCode, 'cl_abap_unit_assert=>assert_equals( exp = abap_true act = value ).\ncl_abap_unit_assert=>assert_equals( exp = 0 act = sy-subrc ).');
  assert.deepEqual(response.appliedRules, []);
});

function ruleSummary(rule: { readonly ruleId: string; readonly displayName: string; readonly startLine: number; readonly endLine: number }): object {
  return { ruleId: rule.ruleId, displayName: rule.displayName, startLine: rule.startLine, endLine: rule.endLine };
}
