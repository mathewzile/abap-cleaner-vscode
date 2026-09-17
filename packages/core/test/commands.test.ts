import assert from 'node:assert/strict';
import test from 'node:test';

import { expandAbapRange, findControlBlockPairs, findEnclosingControlBlock, parseAbapCommands } from '../src/index.js';

test('parses command spans and common ABAP block boundaries', () => {
  const sourceText = 'CLASS lcl_example DEFINITION.\n  METHOD run.\n    WRITE value.\n  ENDMETHOD.\nENDCLASS.';
  const commands = parseAbapCommands(sourceText);
  assert.deepEqual(commands.map((command) => command.kind), ['class-open', 'method-open', 'other', 'method-close', 'class-close']);
  assert.equal(sourceText.slice(commands[1]!.startOffset, commands[1]!.endOffset), 'METHOD run.');
});

test('expands selections to their enclosing method or class', () => {
  const sourceText = 'CLASS lcl_example IMPLEMENTATION.\n  METHOD run.\n    WRITE value.\n  ENDMETHOD.\nENDCLASS.';
  assert.deepEqual(expandAbapRange(sourceText, 3, 3, 'FULL_METHOD'), { startLine: 2, endLine: 4 });
  assert.deepEqual(expandAbapRange(sourceText, 3, 3, 'FULL_CLASS'), { startLine: 1, endLine: 5 });
  assert.deepEqual(expandAbapRange(sourceText, 3, 3, 'FULL_DOCUMENT'), { startLine: 1, endLine: 5 });
});

test('expands selections to enclosing forms and function modules', () => {
  const sourceText = 'FORM run.\n  WRITE value.\nENDFORM.\nFUNCTION z_run.\n  WRITE value.\nENDFUNCTION.';
  assert.deepEqual(expandAbapRange(sourceText, 2, 2, 'FULL_METHOD'), { startLine: 1, endLine: 3 });
  assert.deepEqual(expandAbapRange(sourceText, 5, 5, 'FULL_METHOD'), { startLine: 4, endLine: 6 });
});

test('does not treat deferred class declarations as enclosing blocks', () => {
  const sourceText = 'CLASS lcl_deferred DEFINITION DEFERRED.\nCLASS lcl_example IMPLEMENTATION.\n  METHOD run.\n  ENDMETHOD.\nENDCLASS.';
  assert.deepEqual(expandAbapRange(sourceText, 3, 3, 'FULL_CLASS'), { startLine: 2, endLine: 5 });
});

test('expands selections to enclosing interfaces in full-class mode', () => {
  const sourceText = 'INTERFACE lif_example.\n  METHODS run.\nENDINTERFACE.';
  assert.deepEqual(expandAbapRange(sourceText, 2, 2, 'FULL_CLASS'), { startLine: 1, endLine: 3 });
});

test('finds nested control-block command pairs', () => {
  const sourceText = 'IF condition.\n  LOOP AT values INTO value.\n    TRY.\n      WRITE value.\n    ENDTRY.\n  ENDLOOP.\nENDIF.';
  const commands = parseAbapCommands(sourceText);
  assert.deepEqual(findControlBlockPairs(commands), [
    { kind: 'try', openingCommandIndex: 2, closingCommandIndex: 4 },
    { kind: 'loop', openingCommandIndex: 1, closingCommandIndex: 5 },
    { kind: 'if', openingCommandIndex: 0, closingCommandIndex: 6 },
  ]);
  assert.deepEqual(findEnclosingControlBlock(commands, 3), { kind: 'try', openingCommandIndex: 2, closingCommandIndex: 4 });
  assert.deepEqual(findEnclosingControlBlock(commands, 5), { kind: 'loop', openingCommandIndex: 1, closingCommandIndex: 5 });
});

test('expands selections to the innermost matched control block', () => {
  const sourceText = 'IF condition.\n  LOOP AT values INTO value.\n    WRITE value.\n  ENDLOOP.\nENDIF.';
  assert.deepEqual(expandAbapRange(sourceText, 3, 3, 'FULL_CONTROL_BLOCK'), { startLine: 2, endLine: 4 });
  assert.deepEqual(expandAbapRange('WRITE value.', 1, 1, 'FULL_CONTROL_BLOCK'), { startLine: 1, endLine: 1 });
});

test('does not pair malformed control-block boundaries', () => {
  const commands = parseAbapCommands('IF condition.\n  WRITE value.\nENDLOOP.\nENDIF.');
  assert.deepEqual(findControlBlockPairs(commands), [{ kind: 'if', openingCommandIndex: 0, closingCommandIndex: 3 }]);
});

test('does not let SELECT SINGLE hide an enclosing control block', () => {
  const sourceText = 'IF condition.\n  SELECT SINGLE field FROM table INTO value.\nENDIF.';
  const commands = parseAbapCommands(sourceText);
  assert.deepEqual(findControlBlockPairs(commands), [{ kind: 'if', openingCommandIndex: 0, closingCommandIndex: 2 }]);
  assert.deepEqual(expandAbapRange(sourceText, 2, 2, 'FULL_CONTROL_BLOCK'), { startLine: 1, endLine: 3 });
});

test('does not let SELECT INTO TABLE hide an enclosing control block', () => {
  const sourceText = 'IF condition.\n  SELECT field FROM table INTO TABLE values.\nENDIF.';
  const commands = parseAbapCommands(sourceText);
  assert.deepEqual(findControlBlockPairs(commands), [{ kind: 'if', openingCommandIndex: 0, closingCommandIndex: 2 }]);
  assert.deepEqual(expandAbapRange(sourceText, 2, 2, 'FULL_CONTROL_BLOCK'), { startLine: 1, endLine: 3 });
});

test('does not treat other set-result SELECT forms as control blocks', () => {
  const appending = parseAbapCommands('IF condition.\n  SELECT field FROM source APPENDING TABLE values.\nENDIF.');
  const corresponding = parseAbapCommands('IF condition.\n  SELECT field FROM source INTO CORRESPONDING FIELDS OF TABLE values.\nENDIF.');
  assert.deepEqual(findControlBlockPairs(appending), [{ kind: 'if', openingCommandIndex: 0, closingCommandIndex: 2 }]);
  assert.deepEqual(findControlBlockPairs(corresponding), [{ kind: 'if', openingCommandIndex: 0, closingCommandIndex: 2 }]);
});

test('pairs SELECT loops and expands a selection to their boundaries', () => {
  const sourceText = 'SELECT field FROM source INTO value.\n  WRITE value.\nENDSELECT.';
  const commands = parseAbapCommands(sourceText);
  assert.deepEqual(findControlBlockPairs(commands), [{ kind: 'select', openingCommandIndex: 0, closingCommandIndex: 2 }]);
  assert.deepEqual(expandAbapRange(sourceText, 2, 2, 'FULL_CONTROL_BLOCK'), { startLine: 1, endLine: 3 });
});

test('does not let an unclosed SELECT hide an enclosing control block', () => {
  const sourceText = 'IF condition.\n  SELECT field FROM source INTO value.\nENDIF.';
  const commands = parseAbapCommands(sourceText);
  assert.deepEqual(findControlBlockPairs(commands), [{ kind: 'if', openingCommandIndex: 0, closingCommandIndex: 2 }]);
  assert.deepEqual(expandAbapRange(sourceText, 2, 2, 'FULL_CONTROL_BLOCK'), { startLine: 1, endLine: 3 });
});