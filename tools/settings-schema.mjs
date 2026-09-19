// Shared by tools/gen-settings-schema.mjs and tools/verify-settings-schema.mjs: the mapping from a
// core RuleMetadata/RuleSettingMetadata to its expected VS Code settings-schema property, per
// spec/04-configuration.md's "Schema generation" design.
export function expectedEnabledProperty(rule) {
  const releaseNote = rule.minimumAbapRelease === undefined ? '' : `\n\nRequires ABAP release ${rule.minimumAbapRelease} or later.`;
  return {
    type: ['boolean', 'null'],
    default: null,
    markdownDescription: `**${rule.displayName}**\n\n${rule.description}${releaseNote}`,
  };
}

export function expectedSettingProperty(setting) {
  const description = `Override: ${setting.description}`;
  switch (setting.type) {
    case 'boolean':
      return { type: ['boolean', 'null'], default: null, description };
    case 'integer':
      return { type: ['number', 'null'], minimum: setting.minimum, maximum: setting.maximum, default: null, description };
    case 'string':
      return { type: ['string', 'null'], default: null, description };
    case 'enum':
    case 'selection':
      return { type: ['string', 'null'], enum: [null, ...(setting.options ?? [])], default: null, description };
    default:
      throw new Error(`Unhandled setting type '${setting.type}' for ${setting.name}`);
  }
}

export function ruleProperties(rule) {
  const prefix = `abapCleaner.rules.${rule.id}`;
  const properties = { [`${prefix}.enabled`]: expectedEnabledProperty(rule) };
  for (const setting of rule.settings) {
    properties[`${prefix}.${setting.name}`] = expectedSettingProperty(setting);
  }
  return properties;
}
