import assert from 'node:assert/strict';
import test from 'node:test';
import { removeGeneratedCdsTestClassAbapDoc } from '../src/rules/emptylines/cds-test-class-lines.js';

test('removes exact generated ABAP Doc in annotated local CDS test definitions', () => {
  assert.equal(
    removeGeneratedCdsTestClassAbapDoc('"!@testing I_SalesOrder\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\n  "! In CLASS_SETUP, corresponding doubles and clone(s) for the CDS view under test and its dependencies are created.\n  CLASS-METHODS class_setup.\nENDCLASS.'),
    '"!@testing I_SalesOrder\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\n  CLASS-METHODS class_setup.\nENDCLASS.',
  );
});

test('removes every documented generated CDS test instruction variant', () => {
  assert.equal(
    removeGeneratedCdsTestClassAbapDoc('"!@testing I_SalesOrder\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\n  "! In CLASS_SETUP =  corresponding doubles and clone(s) for the CDS view under test and its dependencies are created.\n  "! In CLASS_TEARDOWN =  Generated database entities (doubles & clones) should be deleted at the end of test class execution.\n  "! SETUP method creates a common start state for each test method =\n  "! In this method test data is inserted into the generated double(s) and the test is executed and\n  "! the results should be asserted with the actuals.\nENDCLASS.'),
    '"!@testing I_SalesOrder\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\nENDCLASS.',
  );
});

test('retains matching ABAP Doc outside an annotated local CDS test definition', () => {
  const sourceText = 'CLASS lcl_example DEFINITION FINAL.\n  "! In CLASS_SETUP, corresponding doubles and clone(s) for the CDS view under test and its dependencies are created.\n  CLASS-METHODS class_setup.\nENDCLASS.';
  assert.equal(removeGeneratedCdsTestClassAbapDoc(sourceText), sourceText);
});

test('requires the testing annotation to be directly attached ABAP Doc', () => {
  const sourceText = '"!@testing I_SalesOrder\n" a separating comment\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\n  "! In CLASS_SETUP, corresponding doubles and clone(s) for the CDS view under test and its dependencies are created.\n  CLASS-METHODS class_setup.\nENDCLASS.';
  assert.equal(removeGeneratedCdsTestClassAbapDoc(sourceText), sourceText);
});

test('removes the generated TODO only before a simple populated VALUE constructor in the matching implementation', () => {
  assert.equal(
    removeGeneratedCdsTestClassAbapDoc('"!@testing I_SalesOrder\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\nENDCLASS.\nCLASS ltc_sales_order IMPLEMENTATION.\n  METHOD prepare.\n    " TODO: Provide the test data here\n    td_sales_order = VALUE #( ( SalesOrder = \'1\' ) ).\n  ENDMETHOD.\nENDCLASS.'),
    '"!@testing I_SalesOrder\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\nENDCLASS.\nCLASS ltc_sales_order IMPLEMENTATION.\n  METHOD prepare.\n    td_sales_order = VALUE #( ( SalesOrder = \'1\' ) ).\n  ENDMETHOD.\nENDCLASS.',
  );
});

test('retains the generated TODO before an empty VALUE constructor and in another class implementation', () => {
  const sourceText = '"!@testing I_SalesOrder\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\nENDCLASS.\nCLASS ltc_other IMPLEMENTATION.\n  " TODO: Provide the test data here\n  td_sales_order = VALUE #( ( SalesOrder = \'1\' ) ).\nENDCLASS.\nCLASS ltc_sales_order IMPLEMENTATION.\n  " TODO: Provide the test data here\n  td_sales_order = VALUE #( ( ) ).\nENDCLASS.';
  assert.equal(removeGeneratedCdsTestClassAbapDoc(sourceText), sourceText);
});