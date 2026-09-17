import assert from 'node:assert/strict';
import test from 'node:test';
import { removeDirectMethodSelfReferences } from '../src/rules/syntax/self-reference-me.js';

test('removes an attached self reference from direct method calls', () => {
  assert.equal(removeDirectMethodSelfReferences('me->refresh( ).'), 'refresh( ).');
  assert.equal(removeDirectMethodSelfReferences('lv_total = me->get_total( ).'), 'lv_total = get_total( ).');
});

test('keeps self references for attributes, whitespace, and literals', () => {
  assert.equal(removeDirectMethodSelfReferences('lv_total = me->mv_total.'), 'lv_total = me->mv_total.');
  assert.equal(removeDirectMethodSelfReferences('me -> refresh( ).'), 'me -> refresh( ).');
  assert.equal(removeDirectMethodSelfReferences("lv_text = 'me->refresh( )'. \" me->refresh( )"), "lv_text = 'me->refresh( )'. \" me->refresh( )");
});