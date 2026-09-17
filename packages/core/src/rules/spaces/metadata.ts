import type { RuleMetadata } from '../../api.js';

export const SPACE_RULES: readonly RuleMetadata[] = [
  {
    id: 'CLOSING_BRACKETS_POSITION',
    displayName: 'Close brackets at line end',
    description: 'Currently moves isolated closing parentheses and brackets to the preceding non-comment line.',
    groupId: 'SPACES',
    defaultEnabled: false,
    settings: [],
  },
  {
    id: 'NEEDLESS_SPACES',
    displayName: 'Remove needless spaces',
    description: 'Currently removes excess same-line whitespace from empty parentheses and brackets.',
    groupId: 'SPACES',
    defaultEnabled: true,
    settings: [
      { name: 'processEmptyBrackets', description: 'Remove multiple spaces from empty parentheses and brackets.', type: 'boolean', defaultValue: true },
    ],
  },
  {
    id: 'SPACES_IN_EMPTY_BRACKETS',
    displayName: 'Put spaces around text literals',
    description: 'Adds missing spaces between text literals and keywords, operators, or comments.',
    groupId: 'SPACES',
    defaultEnabled: true,
    settings: [
      { name: 'separateFromKeywords', description: 'Add space between keywords and text literals.', type: 'boolean', defaultValue: true },
      { name: 'separateFromOperators', description: 'Add space between operators and text literals.', type: 'boolean', defaultValue: true },
      { name: 'separateFromComments', description: 'Add space between text literals and comments.', type: 'boolean', defaultValue: true },
    ],
  },
  {
    id: 'SPACE_BEFORE_PERIOD',
    displayName: 'Remove space before commas and period',
    description: 'Removes same-line spaces before chain commas and statement periods.',
    groupId: 'SPACES',
    defaultEnabled: true,
    settings: [
      { name: 'executeOnComma', description: 'Remove space before chain commas.', type: 'boolean', defaultValue: true },
      { name: 'executeOnPeriod', description: 'Remove space before statement periods.', type: 'boolean', defaultValue: true },
    ],
  },
  {
    id: 'SPACE_AROUND_COMMENT_SIGN',
    displayName: 'Put spaces around " comment sign',
    description: 'Ensures at least one space before and after a line-end " comment sign.',
    groupId: 'SPACES',
    defaultEnabled: true,
    settings: [
      { name: 'spaceBeforeCommentSign', description: 'Separate code and " comment with a space.', type: 'boolean', defaultValue: true },
      { name: 'spaceAfterCommentSign', description: 'Start " comment with a space.', type: 'boolean', defaultValue: true },
    ],
  },
];
