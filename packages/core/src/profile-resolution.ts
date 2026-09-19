// Ported from com/sap/adt/abapcleaner/rulebase/Profile.java @ v1.29.0 (Profile.createDefault(),
// Profile.createEssential()): the two built-in profiles set each rule's initial active state from
// that rule's own `isActiveByDefault()`/`isEssential()` override independently of one another — a
// rule can be essential-profile-active while default-profile-inactive, or vice versa.
import type { RuleMetadata } from './api.js';

export function isRuleActiveInProfile(rule: RuleMetadata, profileName: string): boolean {
  return profileName === 'essential' ? rule.essentialEnabled : rule.defaultEnabled;
}
