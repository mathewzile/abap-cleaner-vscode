import assert from 'node:assert/strict';
import test from 'node:test';

import { removeSimpleParameterEscapeCharacters } from '../src/index.js';

test('removes a noncritical parameter escape from a simple method declaration', () => {
  assert.equal(removeSimpleParameterEscapeCharacters('METHODS run IMPORTING !iv_count TYPE i.'), 'METHODS run IMPORTING iv_count TYPE i.');
  assert.equal(removeSimpleParameterEscapeCharacters('METHODS run IMPORTING optional TYPE i.'), 'METHODS run IMPORTING !optional TYPE i.');
});

test('keeps critical, chained, multiline, and commented parameter declarations unchanged', () => {
  assert.equal(removeSimpleParameterEscapeCharacters('METHODS run IMPORTING !optional TYPE i.'), 'METHODS run IMPORTING !optional TYPE i.');
  assert.equal(removeSimpleParameterEscapeCharacters('METHODS run IMPORTING iv_count TYPE i.'), 'METHODS run IMPORTING iv_count TYPE i.');
  assert.equal(removeSimpleParameterEscapeCharacters('METHODS: run IMPORTING !iv_count TYPE i.'), 'METHODS: run IMPORTING !iv_count TYPE i.');
  assert.equal(removeSimpleParameterEscapeCharacters('METHODS run IMPORTING\n  !iv_count TYPE i.'), 'METHODS run IMPORTING\n  !iv_count TYPE i.');
  assert.equal(removeSimpleParameterEscapeCharacters('METHODS run IMPORTING !iv_count TYPE i. " note'), 'METHODS run IMPORTING !iv_count TYPE i. " note');
});