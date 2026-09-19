export type CleanupLanguage =
  | 'ABAP'
  | 'DDL'
  | 'DCL'
  | 'SQLSCRIPT'
  | 'SQL'
  | 'GRAPH'
  | 'LLANG'
  | 'OTHER'
  | 'NOT_SUPPORTED';

export type CleanupRangeExpandMode =
  | 'FULL_STATEMENT'
  | 'FULL_CONTROL_BLOCK'
  | 'FULL_METHOD'
  | 'FULL_CLASS'
  | 'FULL_DOCUMENT';

export interface CleanupRequest {
  readonly sourceText: string;
  readonly language?: CleanupLanguage;
  readonly range?: {
    readonly startLine: number;
    readonly endLine: number;
  };
  readonly expandMode: CleanupRangeExpandMode;
  readonly profile: ResolvedProfile;
  readonly abapRelease?: string;
  readonly lineSeparator: '\n' | '\r\n';
}

export interface AppliedRule {
  readonly ruleId: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly startColumn?: number;
  readonly endColumn?: number;
  readonly displayName: string;
}

export interface CleanupResponse {
  readonly cleanedCode?: string;
  readonly errorMessage?: string;
  readonly appliedRules: readonly AppliedRule[];
  readonly stats: CleanupStatistics;
}

export interface CleanupStatistics {
  readonly changedLineCount: number;
  readonly appliedRuleCount: number;
  readonly processingTimeMs: number;
}

export interface ResolvedProfile {
  readonly name: string;
  readonly rules: Readonly<Record<string, ResolvedRule>>;
}

export interface ResolvedRule {
  readonly enabled: boolean;
  readonly settings: Readonly<Record<string, boolean | number | string>>;
}

export interface RuleMetadata {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly groupId: string;
  readonly defaultEnabled: boolean;
  readonly essentialEnabled: boolean;
  /** Upstream Java rule class name, e.g. `SelfReferenceMeRule`, used to link to its docs page at `docs/rules/<docId>.md` in the reference repository. */
  readonly docId: string;
  readonly minimumAbapRelease?: number;
  readonly settings: readonly RuleSettingMetadata[];
}

export interface RuleSettingMetadata {
  readonly name: string;
  readonly description: string;
  readonly type: 'boolean' | 'integer' | 'string' | 'enum' | 'selection';
  readonly defaultValue: boolean | number | string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly options?: readonly string[];
}

export interface CleanupEngine {
  clean(request: CleanupRequest): CleanupResponse;
  listRules(): readonly RuleMetadata[];
}
