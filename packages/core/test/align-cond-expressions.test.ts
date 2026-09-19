import assert from 'node:assert/strict';
import test from 'node:test';

import { alignCondExpressions } from '../src/rules/syntax/align-cond-expressions.js';

test('splits WHEN/THEN/ELSE onto their own line, each hang-indented to WHEN\'s column', () => {
  const source = [
    'ev_sign = COND #( WHEN iv_negative = abap_true',
    '                    THEN -1',
    '                      ELSE 1 ).',
  ].join('\n');
  const expected = [
    'ev_sign = COND #( WHEN iv_negative = abap_true',
    '                  THEN -1',
    '                  ELSE 1 ).',
  ].join('\n');
  assert.equal(alignCondExpressions(source), expected);
});

test('splits an already-multi-line but not-yet-separated THEN onto its own line', () => {
  const source = [
    'ev_number = COND #( WHEN io_object->get_number( ) <= co_maximum THEN',
    '                      io_object->get_number( )',
    '                    ELSE',
    '                       co_maximum ).',
  ].join('\n');
  const result = alignCondExpressions(source);
  assert.match(result, /^ev_number = COND #\( WHEN io_object->get_number\( \) <= co_maximum$/m);
  const lines = result.split('\n');
  const thenLine = lines.find((line) => line.trim().startsWith('THEN'))!;
  const elseLine = lines.find((line) => line.trim().startsWith('ELSE'))!;
  const whenLine = lines[0]!;
  const whenColumn = whenLine.indexOf('WHEN');
  assert.equal(thenLine.indexOf('THEN'), whenColumn);
  assert.equal(elseLine.indexOf('ELSE'), whenColumn);
});

test('leaves an already single-line COND expression untouched', () => {
  const source = "ev_value = COND #( WHEN iv_value IS SUPPLIED THEN iv_value ELSE gc_default_value ).";
  assert.equal(alignCondExpressions(source), source);
});

test('refuses a multi-WHEN (tabular) COND expression', () => {
  const source = [
    'ev_result = COND #( WHEN a IS NOT INITIAL THEN a',
    '                     WHEN b IS NOT INITIAL THEN b ).',
  ].join('\n');
  assert.equal(alignCondExpressions(source), source);
});

test('refuses a LET-prefixed COND expression', () => {
  const source = [
    'ev_result = COND #( LET t = 1 IN',
    '                     WHEN a = t THEN a',
    '                     ELSE b ).',
  ].join('\n');
  assert.equal(alignCondExpressions(source), source);
});

test('refuses a SWITCH expression (out of scope for this first cut)', () => {
  const source = [
    'ev_result = SWITCH #( iv_index',
    '                       WHEN 1 THEN a',
    '                       ELSE b ).',
  ].join('\n');
  assert.equal(alignCondExpressions(source), source);
});

test('refuses the whole construct if it contains a comment anywhere inside', () => {
  const source = [
    'ev_sign = COND #( WHEN iv_negative = abap_true',
    '                    THEN -1 " a comment',
    '                      ELSE 1 ).',
  ].join('\n');
  assert.equal(alignCondExpressions(source), source);
});

test('handles a COND with no ELSE clause', () => {
  const source = [
    'ev_sign = COND #( WHEN iv_negative = abap_true',
    '                    THEN -1 ).',
  ].join('\n');
  const expected = [
    'ev_sign = COND #( WHEN iv_negative = abap_true',
    '                  THEN -1 ).',
  ].join('\n');
  assert.equal(alignCondExpressions(source), expected);
});

test('handles a nested COND expression independently of its outer THEN value', () => {
  const source = [
    'ev_result = COND #( WHEN a = 1',
    '  THEN COND #( WHEN b = 2',
    '  THEN 3',
    '  ELSE 4 )',
    '  ELSE 5 ).',
  ].join('\n');
  const result = alignCondExpressions(source);
  // both the outer and the nested COND each got their own WHEN/THEN/ELSE split
  assert.equal((result.match(/^\s*THEN/gm) ?? []).length, 2);
  assert.equal((result.match(/^\s*ELSE/gm) ?? []).length, 2);
});

// NOTE: a WHEN/THEN/ELSE value containing a string template with an embedded expression
// (`|{ expr }|`) is not covered here — this port's shared ABAP tokenizer has a known, pre-existing
// limitation where the template's closing `|` is misread as opening a NEW template segment,
// swallowing everything after it into one bogus token. This is a tokenizer-level gap inherited by
// every rule that scans raw tokens across such a template, not something specific to this rule;
// fixing it is out of scope here (shared infrastructure used by all rules, needs its own dedicated
// fix and regression pass) and is reported separately.

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'ev_sign = COND #( WHEN iv_negative = abap_true',
    '                    THEN -1',
    '                      ELSE 1 ).',
  ].join('\n');
  const once = alignCondExpressions(source);
  const twice = alignCondExpressions(once);
  assert.equal(twice, once);
});
