import assert from 'node:assert/strict';
import test from 'node:test';
import { replaceSimpleReadTableAssigning } from '../src/rules/syntax/read-table.js';

test('replaces a simple READ TABLE WITH KEY ASSIGNING statement', () => {
  assert.equal(
    replaceSimpleReadTableAssigning('  READ TABLE lt_items WITH KEY id = iv_id ASSIGNING <ls_item>.'),
    '  ASSIGN lt_items[ id = iv_id ] TO <ls_item>.',
  );
  assert.equal(
    replaceSimpleReadTableAssigning('READ TABLE lt_items WITH KEY id = 1 ASSIGNING <ls_item>.'),
    'ASSIGN lt_items[ id = 1 ] TO <ls_item>.',
  );
});

test('leaves unsupported READ TABLE forms unchanged', () => {
  assert.equal(replaceSimpleReadTableAssigning('READ TABLE lt_items WITH KEY id = iv_id INTO ls_item.'), 'READ TABLE lt_items WITH KEY id = iv_id INTO ls_item.');
  assert.equal(replaceSimpleReadTableAssigning('READ TABLE lt_items WITH KEY id = iv_id BINARY SEARCH ASSIGNING <ls_item>.'), 'READ TABLE lt_items WITH KEY id = iv_id BINARY SEARCH ASSIGNING <ls_item>.');
  assert.equal(replaceSimpleReadTableAssigning('READ TABLE lt_items WITH KEY id = iv_id ASSIGNING <ls_item>. " keep'), 'READ TABLE lt_items WITH KEY id = iv_id ASSIGNING <ls_item>. " keep');
});