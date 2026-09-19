import assert from 'node:assert/strict';
import test from 'node:test';

import { alignLogicalExpressions } from '../src/rules/syntax/align-logical-expressions.js';

test('aligns a 3-condition AND chain, leaving the IF line untouched', () => {
  const source = [
    'IF a = 1',
    'AND bb = 22',
    'AND c = 3.',
  ].join('\n');
  const expected = [
    'IF a = 1',
    'AND bb = 22',
    'AND c  = 3.',
  ].join('\n');
  assert.equal(alignLogicalExpressions(source), expected);
});

test('aligns an OR chain', () => {
  const source = [
    'CHECK a = 1',
    'OR bb = 22',
    'OR c = 3.',
  ].join('\n');
  const expected = [
    'CHECK a = 1',
    'OR bb = 22',
    'OR c  = 3.',
  ].join('\n');
  assert.equal(alignLogicalExpressions(source), expected);
});

test('supports ELSEIF and WHILE as trigger keywords', () => {
  const source = [
    'ELSEIF a = 1',
    'AND bb = 22',
    'AND c = 3.',
  ].join('\n');
  const expected = [
    'ELSEIF a = 1',
    'AND bb = 22',
    'AND c  = 3.',
  ].join('\n');
  assert.equal(alignLogicalExpressions(source), expected);

  const whileSource = [
    'WHILE a = 1',
    'AND bb = 22',
    'AND c = 3.',
  ].join('\n');
  const whileExpected = [
    'WHILE a = 1',
    'AND bb = 22',
    'AND c  = 3.',
  ].join('\n');
  assert.equal(alignLogicalExpressions(whileSource), whileExpected);
});

test('does not touch a lone condition (no AND/OR continuation)', () => {
  const source = 'IF a = 1.';
  assert.equal(alignLogicalExpressions(source), source);
});

test('refuses a chain mixing AND and OR', () => {
  const source = [
    'IF a = 1',
    'AND bb = 22',
    'OR c = 3.',
  ].join('\n');
  assert.equal(alignLogicalExpressions(source), source);
});

test('refuses a condition using NOT', () => {
  const source = [
    'IF NOT a = 1',
    'AND bb = 22.',
  ].join('\n');
  assert.equal(alignLogicalExpressions(source), source);
});

test('refuses a chain containing parentheses', () => {
  const source = [
    'IF ( a = 1',
    'AND bb = 22 )',
    'AND c = 3.',
  ].join('\n');
  assert.equal(alignLogicalExpressions(source), source);
});

test('refuses a predicate expression (IS INITIAL)', () => {
  const source = [
    'IF a IS INITIAL',
    'AND bb = 22.',
  ].join('\n');
  assert.equal(alignLogicalExpressions(source), source);
});

test('refuses keyword-style comparison operators (EQ)', () => {
  const source = [
    'IF a EQ 1',
    'AND bb EQ 22.',
  ].join('\n');
  assert.equal(alignLogicalExpressions(source), source);
});

test('refuses a chain whose conditions use different comparison operators', () => {
  const source = [
    'IF a = 1',
    'AND bb <> 22.',
  ].join('\n');
  assert.equal(alignLogicalExpressions(source), source);
});

test('refuses when the whole expression is crammed onto one line', () => {
  const source = 'IF a = 1 AND bb = 22.';
  assert.equal(alignLogicalExpressions(source), source);
});

test('refuses when two continuation conditions share a line with each other', () => {
  const source = [
    'IF a = 1',
    'AND bb = 22 AND c = 3.',
  ].join('\n');
  assert.equal(alignLogicalExpressions(source), source);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'IF a = 1',
    'AND bb = 22',
    'AND c = 3.',
  ].join('\n');
  const once = alignLogicalExpressions(source);
  const twice = alignLogicalExpressions(once);
  assert.equal(twice, once);
});
