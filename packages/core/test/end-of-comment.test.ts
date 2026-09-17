import assert from 'node:assert/strict';
import test from 'node:test';

import { removeRedundantMethodEndComments } from '../src/index.js';

test('removes an ENDMETHOD comment that exactly repeats its paired method name', () => {
  assert.equal(
    removeRedundantMethodEndComments('METHOD run.\n  work( ).\nENDMETHOD.  " run'),
    'METHOD run.\n  work( ).\nENDMETHOD.',
  );
});

test('keeps nonmatching, pseudo, and unpaired end comments', () => {
  assert.equal(removeRedundantMethodEndComments('METHOD run.\nENDMETHOD. " important note'), 'METHOD run.\nENDMETHOD. " important note');
  assert.equal(removeRedundantMethodEndComments('METHOD run.\nENDMETHOD. "#EC NEEDED'), 'METHOD run.\nENDMETHOD. "#EC NEEDED');
  assert.equal(removeRedundantMethodEndComments('ENDMETHOD. " run'), 'ENDMETHOD. " run');
});

test('removes exact paired FORM and FUNCTION end comments', () => {
  assert.equal(removeRedundantMethodEndComments('FORM process.\nENDFORM. " process'), 'FORM process.\nENDFORM.');
  assert.equal(removeRedundantMethodEndComments('FUNCTION execute.\nENDFUNCTION. " execute'), 'FUNCTION execute.\nENDFUNCTION.');
});