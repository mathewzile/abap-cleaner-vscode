import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDdlAnnotationLayout } from '../src/rules/ddl/annotation-layout.js';

test('removes space after @ and before the colon, and adds a space after the colon', () => {
  assert.equal(normalizeDdlAnnotationLayout('@  Search.fuzzinessThreshold :0.7'), '@Search.fuzzinessThreshold: 0.7');
});

test('condenses an annotation path split across spaces and lines onto one contiguous path', () => {
  assert.equal(
    normalizeDdlAnnotationLayout("@ObjectModel. lifecycle. draft .expiryInterval:'PT28D'"),
    "@ObjectModel.lifecycle.draft.expiryInterval: 'PT28D'",
  );
});

test('fixes spacing around every colon in a structured annotation value, not just the first', () => {
  assert.equal(
    normalizeDdlAnnotationLayout('@ObjectModel.usageType: { serviceQuality: #D, sizeCategory:#XXL, dataClass :#MIXED }'),
    '@ObjectModel.usageType: { serviceQuality: #D, sizeCategory: #XXL, dataClass: #MIXED }',
  );
});

test('leaves a non-annotation colon (e.g. a DDL parameter declaration) untouched', () => {
  const source = "@EndUserText.label: 'x'\ndefine view entity C_Any with parameters P_Any : abap.cuky as select from I_Any";
  assert.equal(normalizeDdlAnnotationLayout(source), source);
});

test('does not force same-line spacing across a deliberate multi-line value break after a colon', () => {
  const source = "@Consumption.valueHelpDefinition:\n[ { entity.name: 'X' } ]";
  assert.equal(normalizeDdlAnnotationLayout(source), source);
});

test('leaves an already-correctly-formatted annotation unchanged', () => {
  const source = "@ObjectModel.usageType: { serviceQuality: #D, sizeCategory: #XXL }";
  assert.equal(normalizeDdlAnnotationLayout(source), source);
});
