import assert from 'node:assert/strict';
import test from 'node:test';
import { addNoWherePseudoCommentToSimpleCdsTestSelect } from '../src/rules/syntax/camel-case-in-cds-test.js';

test('adds CI_NOWHERE to an exact SELECT of the annotated CDS test view', () => {
  assert.equal(
    addNoWherePseudoCommentToSimpleCdsTestSelect('"!@testing I_SalesOrder\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\nENDCLASS.\nCLASS ltc_sales_order IMPLEMENTATION.\n  METHOD test.\n    SELECT * FROM I_SalesOrder INTO TABLE @lt_results.\n  ENDMETHOD.\nENDCLASS.'),
    '"!@testing I_SalesOrder\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\nENDCLASS.\nCLASS ltc_sales_order IMPLEMENTATION.\n  METHOD test.\n    SELECT * FROM I_SalesOrder INTO TABLE @lt_results. "#EC CI_NOWHERE\n  ENDMETHOD.\nENDCLASS.',
  );
});

test('retains SELECT statements with a WHERE clause, comment, or another source', () => {
  const sourceText = '"!@testing I_SalesOrder\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\nENDCLASS.\nCLASS ltc_sales_order IMPLEMENTATION.\n  SELECT * FROM I_OtherView INTO TABLE @lt_results.\n  SELECT * FROM I_SalesOrder WHERE SalesOrder = \'1\' INTO TABLE @lt_results.\n  SELECT * FROM I_SalesOrder INTO TABLE @lt_results. " keep\nENDCLASS.';
  assert.equal(addNoWherePseudoCommentToSimpleCdsTestSelect(sourceText), sourceText);
});

test('requires the testing annotation to remain directly attached ABAP Doc', () => {
  const sourceText = '"!@testing I_SalesOrder\n" ordinary comment\nCLASS ltc_sales_order DEFINITION FINAL FOR TESTING.\nENDCLASS.\nCLASS ltc_sales_order IMPLEMENTATION.\n  SELECT * FROM I_SalesOrder INTO TABLE @lt_results.\nENDCLASS.';
  assert.equal(addNoWherePseudoCommentToSimpleCdsTestSelect(sourceText), sourceText);
});