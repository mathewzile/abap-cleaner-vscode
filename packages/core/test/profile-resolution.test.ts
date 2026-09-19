import assert from 'node:assert/strict';
import test from 'node:test';

import { isRuleActiveInProfile } from '../src/profile-resolution.js';
import type { RuleMetadata } from '../src/api.js';

function rule(overrides: Partial<RuleMetadata>): RuleMetadata {
  return {
    id: 'ANY_RULE',
    displayName: 'Any rule',
    description: 'Any rule.',
    groupId: 'SYNTAX',
    defaultEnabled: false,
    essentialEnabled: false,
    docId: 'AnyRule',
    settings: [],
    ...overrides,
  };
}

test('the default profile activates a rule based on defaultEnabled, ignoring essentialEnabled', () => {
  assert.equal(isRuleActiveInProfile(rule({ defaultEnabled: true, essentialEnabled: false }), 'default'), true);
  assert.equal(isRuleActiveInProfile(rule({ defaultEnabled: false, essentialEnabled: true }), 'default'), false);
});

test('the essential profile activates a rule based on essentialEnabled, ignoring defaultEnabled', () => {
  assert.equal(isRuleActiveInProfile(rule({ defaultEnabled: false, essentialEnabled: true }), 'essential'), true);
  assert.equal(isRuleActiveInProfile(rule({ defaultEnabled: true, essentialEnabled: false }), 'essential'), false);
});
