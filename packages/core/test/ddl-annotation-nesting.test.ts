import assert from 'node:assert/strict';
import test from 'node:test';

import { nestDdlAnnotations } from '../src/rules/ddl/annotation-nesting.js';

const FIVE_SIBLINGS = [
  "@ObjectModel.lifecycle.draft.notificationBeforeExpiryInterval: 'PT10D'",
  "@ObjectModel.lifecycle.draft.expiryInterval: 'PT28D'",
  '@ObjectModel.lifecycle.draft.isCreatedByOwner: true',
  '@ObjectModel.lifecycle.draft.isProcessedByOwner: true',
  '@ObjectModel.lifecycle.draft.hasActiveEntity: true',
].join('\n');

test('nests a run of 5 adjacent simple annotations sharing a 3-segment parent path', () => {
  const result = nestDdlAnnotations(FIVE_SIBLINGS);
  assert.notEqual(result, FIVE_SIBLINGS);
  assert.match(result, /^@ObjectModel\.lifecycle\.draft: \{ /);
  assert.match(result, / \}$/);
  // never collapses to one line even though the merged group would fit
  assert.equal(result.split('\n').length, 5);
});

test('is idempotent: running twice on already-nested output makes no further change', () => {
  const once = nestDdlAnnotations(FIVE_SIBLINGS);
  const twice = nestDdlAnnotations(once);
  assert.equal(twice, once);
});

test('refuses a run of only 4 siblings (below the 5-member always-multi-line threshold)', () => {
  const source = [
    "@ObjectModel.lifecycle.draft.notificationBeforeExpiryInterval: 'PT10D'",
    "@ObjectModel.lifecycle.draft.expiryInterval: 'PT28D'",
    '@ObjectModel.lifecycle.draft.isCreatedByOwner: true',
    '@ObjectModel.lifecycle.draft.isProcessedByOwner: true',
  ].join('\n');
  assert.equal(nestDdlAnnotations(source), source);
});

test('refuses a parent path shorter than 3 segments even with 5+ siblings', () => {
  const source = [
    "@ObjectModel.a: 'x'",
    "@ObjectModel.b: 'y'",
    "@ObjectModel.c: 'z'",
    "@ObjectModel.d: 'w'",
    "@ObjectModel.e: 'v'",
  ].join('\n');
  assert.equal(nestDdlAnnotations(source), source);
});

test('a blank line between candidate annotations breaks the run', () => {
  const source = [
    "@ObjectModel.lifecycle.draft.notificationBeforeExpiryInterval: 'PT10D'",
    "@ObjectModel.lifecycle.draft.expiryInterval: 'PT28D'",
    '',
    '@ObjectModel.lifecycle.draft.isCreatedByOwner: true',
    '@ObjectModel.lifecycle.draft.isProcessedByOwner: true',
    '@ObjectModel.lifecycle.draft.hasActiveEntity: true',
  ].join('\n');
  assert.equal(nestDdlAnnotations(source), source);
});

test('an annotation whose value is already a { } structure excludes it and breaks the run', () => {
  const source = [
    "@ObjectModel.lifecycle.draft.notificationBeforeExpiryInterval: 'PT10D'",
    "@ObjectModel.lifecycle.draft.expiryInterval: 'PT28D'",
    '@ObjectModel.lifecycle.draft.isCreatedByOwner: { value: true }',
    '@ObjectModel.lifecycle.draft.isProcessedByOwner: true',
    '@ObjectModel.lifecycle.draft.hasActiveEntity: true',
  ].join('\n');
  assert.equal(nestDdlAnnotations(source), source);
});

test('an annotation with a trailing comment excludes it and breaks the run', () => {
  const source = [
    "@ObjectModel.lifecycle.draft.notificationBeforeExpiryInterval: 'PT10D'",
    "@ObjectModel.lifecycle.draft.expiryInterval: 'PT28D' // keep",
    '@ObjectModel.lifecycle.draft.isCreatedByOwner: true',
    '@ObjectModel.lifecycle.draft.isProcessedByOwner: true',
    '@ObjectModel.lifecycle.draft.hasActiveEntity: true',
  ].join('\n');
  assert.equal(nestDdlAnnotations(source), source);
});

test('nests element-level (indented) annotations, hanging-indenting to the brace column', () => {
  const source = [
    "  @ObjectModel.lifecycle.draft.notificationBeforeExpiryInterval: 'PT10D'",
    "  @ObjectModel.lifecycle.draft.expiryInterval: 'PT28D'",
    '  @ObjectModel.lifecycle.draft.isCreatedByOwner: true',
    '  @ObjectModel.lifecycle.draft.isProcessedByOwner: true',
    '  @ObjectModel.lifecycle.draft.hasActiveEntity: true',
  ].join('\n');
  const result = nestDdlAnnotations(source);
  assert.match(result, /^  @ObjectModel\.lifecycle\.draft: \{ /);
  const lines = result.split('\n');
  assert.equal(lines.length, 5);
  const hangingIndent = ' '.repeat(2 + '@ObjectModel.lifecycle.draft: { '.length);
  for (const line of lines.slice(1)) {
    assert.ok(line.startsWith(hangingIndent), `expected "${line}" to start with ${hangingIndent.length} spaces`);
    assert.notEqual(line[hangingIndent.length], ' ');
  }
});
