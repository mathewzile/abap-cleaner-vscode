import assert from 'node:assert/strict';
import test from 'node:test';

import { simplifyCreateObject } from '../src/index.js';

test('converts simple static CREATE OBJECT statements', () => {
  assert.equal(simplifyCreateObject('CREATE OBJECT lo_instance.'), 'lo_instance = NEW #( ).');
  assert.equal(simplifyCreateObject('CREATE OBJECT lo_instance TYPE cl_example.'), 'lo_instance = NEW cl_example( ).');
  assert.equal(simplifyCreateObject('CREATE OBJECT lo_instance EXPORTING iv_value = value.'), 'lo_instance = NEW #( iv_value = value ).');
  assert.equal(simplifyCreateObject('CREATE OBJECT lo_instance EXPORTING iv_value = value io_other = lo_other.'), 'lo_instance = NEW #( iv_value = value io_other = lo_other ).');
  assert.equal(simplifyCreateObject("CREATE OBJECT lo_instance TYPE cl_example EXPORTING iv_value = 'value'."), "lo_instance = NEW cl_example( iv_value = 'value' ).");
});

test('keeps parameterized, dynamic, and special CREATE OBJECT statements', () => {
  assert.equal(simplifyCreateObject('CREATE OBJECT lo_instance TYPE (class_name).'), 'CREATE OBJECT lo_instance TYPE (class_name).');
  assert.equal(simplifyCreateObject('CREATE OBJECT lo_instance AREA HANDLE handle.'), 'CREATE OBJECT lo_instance AREA HANDLE handle.');
  assert.equal(simplifyCreateObject('CREATE OBJECT lo_instance TYPE cl_example EXCEPTIONS others = 1.'), 'CREATE OBJECT lo_instance TYPE cl_example EXCEPTIONS others = 1.');
  assert.equal(simplifyCreateObject('CREATE OBJECT lo_instance EXPORTING iv_value = get_value( ).'), 'CREATE OBJECT lo_instance EXPORTING iv_value = get_value( ).');
  assert.equal(simplifyCreateObject('CREATE OBJECT lo_instance EXPORTING iv_value = lo_instance.'), 'CREATE OBJECT lo_instance EXPORTING iv_value = lo_instance.');
  assert.equal(simplifyCreateObject('CREATE OBJECT lo_instance EXPORTING iv_value = value " keep'), 'CREATE OBJECT lo_instance EXPORTING iv_value = value " keep');
});