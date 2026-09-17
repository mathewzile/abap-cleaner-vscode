import assert from 'node:assert/strict';
import test from 'node:test';

import { removeEnglishLangFromAbapDoc } from '../src/index.js';

test('removes English language attributes from synchronized ABAP Doc shorttexts', () => {
  assert.equal(removeEnglishLangFromAbapDoc('"! <p class="shorttext synchronized" lang="en">Documentation</p>'), '"! <p class="shorttext synchronized">Documentation</p>');
  assert.equal(removeEnglishLangFromAbapDoc('  "! @parameter value | <p class="shorttext synchronized" lang="EN">Documentation</p>'), '  "! @parameter value | <p class="shorttext synchronized">Documentation</p>');
});

test('keeps ordinary comments, non-synchronized text, and other languages', () => {
  assert.equal(removeEnglishLangFromAbapDoc('" <p class="shorttext synchronized" lang="en">Comment</p>'), '" <p class="shorttext synchronized" lang="en">Comment</p>');
  assert.equal(removeEnglishLangFromAbapDoc('"! <p class="shorttext" lang="en">Text</p>'), '"! <p class="shorttext" lang="en">Text</p>');
  assert.equal(removeEnglishLangFromAbapDoc('"! <p class="shorttext synchronized" lang="de">Text</p>'), '"! <p class="shorttext synchronized" lang="de">Text</p>');
});