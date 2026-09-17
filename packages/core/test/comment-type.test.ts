import assert from 'node:assert/strict';
import test from 'node:test';
import { convertUnambiguousAsteriskComments } from '../src/rules/syntax/comment-type.js';

test('converts unambiguous column-one prose asterisk comments', () => {
  assert.equal(convertUnambiguousAsteriskComments('* Explain the following calculation\nWRITE value.'), '" Explain the following calculation\nWRITE value.');
  assert.equal(convertUnambiguousAsteriskComments('* This comment has punctuation.'), '" This comment has punctuation.');
});

test('keeps code-shaped, directive, separator, and short asterisk comments', () => {
  assert.equal(convertUnambiguousAsteriskComments('* DATA lv_value TYPE i.'), '* DATA lv_value TYPE i.');
  assert.equal(convertUnambiguousAsteriskComments('* "#EC NEEDED'), '* "#EC NEEDED');
  assert.equal(convertUnambiguousAsteriskComments('********************'), '********************');
  assert.equal(convertUnambiguousAsteriskComments('* Heading'), '* Heading');
});