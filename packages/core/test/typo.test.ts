import assert from 'node:assert/strict';
import test from 'node:test';

import { correctUnambiguousCommentTypos } from '../src/index.js';

test('corrects the embedded unambiguous typo subset in comments with case preservation', () => {
  assert.equal(correctUnambiguousCommentTypos('" additonal allways\n* ATTACHEMENT'), '" additional always\n* ATTACHMENT');
});

test('does not change source literals or unknown comment words', () => {
  assert.equal(correctUnambiguousCommentTypos("value = 'additonal'. \" unkown"), "value = 'additonal'. \" unkown");
});