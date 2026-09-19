import assert from 'node:assert/strict';
import test from 'node:test';

import { alignWithSecondWord } from '../src/rules/syntax/align-with-second-word.js';

test('re-indents a WITH continuation keyword to the READ TABLE second word column', () => {
  const source = [
    'READ TABLE lth_any_hash_table ASSIGNING <ls_row>',
    '  WITH TABLE KEY item_id = 1.',
  ].join('\n');
  const expected = [
    'READ TABLE lth_any_hash_table ASSIGNING <ls_row>',
    '     WITH TABLE KEY item_id = 1.',
  ].join('\n');
  assert.equal(alignWithSecondWord(source), expected);
});

test('re-indents an ASSIGNING continuation keyword for LOOP AT', () => {
  const source = [
    'LOOP AT mo_item_manager->get_all_items( )',
    '  ASSIGNING FIELD-SYMBOL(<lo_item>).',
  ].join('\n');
  const expected = [
    'LOOP AT mo_item_manager->get_all_items( )',
    '     ASSIGNING FIELD-SYMBOL(<lo_item>).',
  ].join('\n');
  assert.equal(alignWithSecondWord(source), expected);
});

test('re-indents multiple continuation keywords to the same column', () => {
  const source = [
    'READ TABLE lts_any_sorted_table',
    'WITH TABLE KEY item_type = a',
    'INTO DATA(ls_struc).',
  ].join('\n');
  const expected = [
    'READ TABLE lts_any_sorted_table',
    '     WITH TABLE KEY item_type = a',
    '     INTO DATA(ls_struc).',
  ].join('\n');
  assert.equal(alignWithSecondWord(source), expected);
});

test('does not reposition AND/OR/EQUIV boolean operators', () => {
  const source = [
    'DELETE lts_any_sorted_table',
    '  WHERE item_key < 1',
    '  AND item_type = 2.',
  ].join('\n');
  assert.equal(alignWithSecondWord(source), source);
});

test('does not touch a trigger keyword not in the READ/LOOP include list', () => {
  const source = [
    'INSERT lts_any_sorted_table',
    'INTO TABLE lt_target.',
  ].join('\n');
  assert.equal(alignWithSecondWord(source), source);
});

test('does not touch a continuation keyword not in the fixed set', () => {
  const source = [
    'READ TABLE lth_x ASSIGNING <fs>',
    'GROUP BY key.',
  ].join('\n');
  assert.equal(alignWithSecondWord(source), source);
});

test('does not touch a command whose second token is not on the first line', () => {
  const source = [
    'READ',
    '  TABLE lth_x ASSIGNING <fs>',
    '  WITH KEY a = 1.',
  ].join('\n');
  assert.equal(alignWithSecondWord(source), source);
});

test('leaves an already correctly aligned continuation keyword unchanged', () => {
  const source = [
    'READ TABLE lth_any_hash_table ASSIGNING <ls_row>',
    '     WITH TABLE KEY item_id = 1.',
  ].join('\n');
  assert.equal(alignWithSecondWord(source), source);
});

test('re-indents a continuation keyword even with a leading-comment line above it', () => {
  const source = [
    'READ TABLE lth_x ASSIGNING <fs>',
    '* comment',
    'WITH KEY a = 1.',
  ].join('\n');
  const expected = [
    'READ TABLE lth_x ASSIGNING <fs>',
    '* comment',
    '     WITH KEY a = 1.',
  ].join('\n');
  assert.equal(alignWithSecondWord(source), expected);
});

test('is idempotent: running twice on already-aligned code makes no further change', () => {
  const source = [
    'READ TABLE lth_any_hash_table ASSIGNING <ls_row>',
    '  WITH TABLE KEY item_id = 1.',
  ].join('\n');
  const once = alignWithSecondWord(source);
  const twice = alignWithSecondWord(once);
  assert.equal(twice, once);
});
