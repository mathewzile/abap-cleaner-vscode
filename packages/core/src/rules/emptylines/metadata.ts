import type { RuleMetadata } from '../../api.js';

export const EMPTY_LINE_RULES: readonly RuleMetadata[] = [
  {
    id: 'CDS_TEST_CLASS_LINES',
    displayName: 'Standardize test classes for CDS views',
    description: 'Currently removes exact generated ABAP Doc instructions and TODO comments before simple populated VALUE constructors in annotated local CDS test classes.',
    groupId: 'EMPTY_LINES',
    defaultEnabled: false,
    settings: [],
  },
  {
    id: 'EMPTY_LINES_IN_CLASS_DEFINITION',
    displayName: 'Standardize empty lines in class definitions',
    description: 'Currently limits consecutive blank lines inside non-deferred class definitions.',
    groupId: 'EMPTY_LINES',
    defaultEnabled: true,
    settings: [
      { name: 'maxEmptyLines', description: 'Maximum consecutive blank lines in class definitions.', type: 'integer', defaultValue: 1, minimum: 1, maximum: 20 },
    ],
  },
  {
    id: 'EMPTY_LINES_OUTSIDE_METHODS',
    displayName: 'Separate methods and classes with empty lines',
    description: 'Currently standardizes blank lines directly between class and interface blocks.',
    groupId: 'EMPTY_LINES',
    defaultEnabled: true,
    settings: [
      { name: 'emptyLinesBetweenClasses', description: 'Blank lines between classes or interfaces.', type: 'integer', defaultValue: 2, minimum: 0, maximum: 5 },
    ],
  },
  {
    id: 'EMPTY_LINES_WITHIN_METHODS',
    displayName: 'Standardize empty lines within methods',
    description: 'Limits consecutive blank lines inside METHOD and ENDMETHOD blocks.',
    groupId: 'EMPTY_LINES',
    defaultEnabled: true,
    settings: [
      { name: 'maxEmptyLinesWithinMethods', description: 'Maximum consecutive blank lines within methods.', type: 'integer', defaultValue: 1, minimum: 0, maximum: 20 },
    ],
  },
  {
    id: 'ONE_COMMAND_PER_LINE',
    displayName: 'Move commands to own lines',
    description: 'Currently splits consecutive simple, uncommented same-line commands while retaining the existing indent.',
    groupId: 'EMPTY_LINES',
    defaultEnabled: false,
    settings: [],
  },
];