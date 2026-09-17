import type {
  AppliedRule,
  CleanupEngine,
  CleanupRequest,
  CleanupResponse,
  RuleMetadata,
} from './api.js';
import { previewLanguage } from './base/language.js';
import { DECLARATION_RULES } from './rules/declarations/metadata.js';
import { removeEnglishLangFromAbapDoc } from './rules/declarations/abap-doc-lang.js';
import { addSimpleMissingAbapDocParameters } from './rules/declarations/abap-doc-parameters.js';
import { simplifyChainOfOne } from './rules/declarations/chain-of-one.js';
import { normalizeSimpleClassDefinitionOptions } from './rules/declarations/class-definition.js';
import { unchainSimpleDeclarations } from './rules/declarations/declaration-chain.js';
import { removeEmptyProtectedSectionsFromFinalLocalClasses } from './rules/declarations/empty-sections.js';
import { makeSimpleImplicitTypesExplicit } from './rules/declarations/implicit-type.js';
import { removeInitialScalarClears } from './rules/declarations/needless-clear.js';
import { removeSimpleParameterEscapeCharacters } from './rules/declarations/escape-char-for-params.js';
import { EMPTY_LINE_RULES } from './rules/emptylines/metadata.js';
import { removeGeneratedCdsTestClassAbapDoc } from './rules/emptylines/cds-test-class-lines.js';
import { normalizeEmptyLinesInClassDefinition } from './rules/emptylines/empty-lines-in-class-definition.js';
import { normalizeEmptyLinesWithinMethods } from './rules/emptylines/empty-lines-within-methods.js';
import { normalizeEmptyLinesOutsideMethods } from './rules/emptylines/empty-lines-outside-methods.js';
import { moveSimpleCommandsToOwnLines } from './rules/emptylines/one-command-per-line.js';
import { SPACE_RULES } from './rules/spaces/metadata.js';
import { normalizeCommentSignSpacing } from './rules/spaces/space-around-comment-sign.js';
import { moveIsolatedClosingBracketsToPreviousLine } from './rules/spaces/closing-brackets-position.js';
import { normalizeEmptyBracketSpacing } from './rules/spaces/needless-spaces.js';
import { removeSpaceBeforePunctuation } from './rules/spaces/space-before-period.js';
import { normalizeTextLiteralSpacing } from './rules/spaces/space-around-text-literal.js';
import { SYNTAX_RULES } from './rules/syntax/metadata.js';
import { simplifyAssertEqualsBoolean } from './rules/syntax/assert-equals-boolean.js';
import { simplifyAssertEqualsSubrc } from './rules/syntax/assert-equals-subrc.js';
import { replaceSimpleAssertWithClass } from './rules/syntax/assert-class.js';
import { standardizeSimpleAssertEqualsParameterOrder } from './rules/syntax/assert-parameter-order.js';
import { replaceSimpleAddToEtc } from './rules/syntax/add-to-etc.js';
import { convertSimpleChecksInLoops } from './rules/syntax/check-in-loop.js';
import { convertSimpleChecksOutsideLoops } from './rules/syntax/check-outside-loop.js';
import { removeSimpleCallMethod } from './rules/syntax/call-method.js';
import { normalizeSimpleCalculationAssignments } from './rules/syntax/calculation-assignment.js';
import { addNoWherePseudoCommentToSimpleCdsTestSelect } from './rules/syntax/camel-case-in-cds-test.js';
import { convertUnambiguousAsteriskComments } from './rules/syntax/comment-type.js';
import { normalizeComparisonOperators } from './rules/syntax/comparison-operator.js';
import { simplifyCreateObject } from './rules/syntax/create-object.js';
import { replaceTerminalDescribeTableLines } from './rules/syntax/describe-table.js';
import { removeStandaloneEmptyCommands } from './rules/syntax/empty-command.js';
import { removeRedundantMethodEndComments } from './rules/syntax/end-of-comment.js';
import { splitSimpleEqualsSignChains } from './rules/syntax/equals-sign-chain.js';
import { replaceExitOutsideLoops } from './rules/syntax/exit-outside-loop.js';
import { replaceSimpleIfBlockAtMethodEnd } from './rules/syntax/if-block-at-method-end.js';
import { replaceSimpleIfBlockAtLoopEnd } from './rules/syntax/if-block-at-loop-end.js';
import { removeOptionalExporting } from './rules/syntax/exporting-keyword.js';
import { moveTerminalLogicalOperators } from './rules/syntax/logical-operator-position.js';
import { normalizeNotIs } from './rules/syntax/not-is.js';
import { simplifyMoveTo } from './rules/syntax/move-to.js';
import { removeSimpleLogicalParentheses } from './rules/syntax/needless-parentheses.js';
import { replaceSimplePseudoComments } from './rules/syntax/pseudo-comment.js';
import { moveTrailingPragmasBeforePeriod } from './rules/syntax/pragma-position.js';
import { simplifyRaiseType } from './rules/syntax/raise-type.js';
import { replaceSimpleReadTableAssigning } from './rules/syntax/read-table.js';
import { correctUnambiguousCommentTypos } from './rules/syntax/typo.js';
import { replaceDeclaredTranslateCase } from './rules/syntax/translate.js';
import { uppercaseStandaloneStatementKeywords } from './rules/syntax/upper-and-lower-case.js';
import { removeSimpleReceiving } from './rules/syntax/receiving-keyword.js';
import { removeDirectMethodSelfReferences } from './rules/syntax/self-reference-me.js';
import { replaceSimpleStringConcatenations } from './rules/syntax/string-template.js';
import { replaceDeclaredCondense } from './rules/syntax/condense.js';
import { shortenSimpleValueStatements } from './rules/syntax/value-statement.js';

export class TypeScriptCleanupEngine implements CleanupEngine {
  clean(request: CleanupRequest): CleanupResponse {
    const startedAt = Date.now();
    if ((request.language ?? previewLanguage(request.sourceText)) !== 'ABAP') {
      return createResponse(request.sourceText, [], startedAt);
    }

    let cleanedCode = request.sourceText;
    const appliedRules: AppliedRule[] = [];
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'ABAP_DOC_LANG', removeEnglishLangFromAbapDoc);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'ABAP_DOC_PARAMETERS', addSimpleMissingAbapDocParameters);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'IMPLICIT_TYPE', makeSimpleImplicitTypesExplicit);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'NEEDLESS_CLEAR', removeInitialScalarClears);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'ESCAPE_CHAR_FOR_PARAMS', removeSimpleParameterEscapeCharacters);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'CLASS_DEFINITION', normalizeSimpleClassDefinitionOptions);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'EMPTY_SECTIONS', removeEmptyProtectedSectionsFromFinalLocalClasses);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'CHAIN_OF_ONE', (sourceText) =>
      simplifyChainOfOne(sourceText, {
        processSimpleChains: booleanSetting(request, 'CHAIN_OF_ONE', 'processSimpleChains') ?? true,
      }),
    );
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'DECLARATION_CHAIN', unchainSimpleDeclarations);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'CDS_TEST_CLASS_LINES', removeGeneratedCdsTestClassAbapDoc);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'EMPTY_LINES_IN_CLASS_DEFINITION', (sourceText) =>
      normalizeEmptyLinesInClassDefinition(sourceText, {
        maxEmptyLines: integerSetting(request, 'EMPTY_LINES_IN_CLASS_DEFINITION', 'maxEmptyLines') ?? 1,
      }),
    );
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'EMPTY_LINES_OUTSIDE_METHODS', (sourceText) =>
      normalizeEmptyLinesOutsideMethods(sourceText, {
        emptyLinesBetweenClasses: integerSetting(request, 'EMPTY_LINES_OUTSIDE_METHODS', 'emptyLinesBetweenClasses') ?? 2,
      }),
    );
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'EMPTY_LINES_WITHIN_METHODS', (sourceText) =>
      normalizeEmptyLinesWithinMethods(sourceText, {
        maxEmptyLinesWithinMethods: integerSetting(request, 'EMPTY_LINES_WITHIN_METHODS', 'maxEmptyLinesWithinMethods') ?? 1,
      }),
    );
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'ONE_COMMAND_PER_LINE', moveSimpleCommandsToOwnLines);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'NEEDLESS_SPACES', (sourceText) =>
      normalizeEmptyBracketSpacing(sourceText, {
        processEmptyBrackets: booleanSetting(request, 'NEEDLESS_SPACES', 'processEmptyBrackets') ?? true,
      }),
    );
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'CLOSING_BRACKETS_POSITION', moveIsolatedClosingBracketsToPreviousLine);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'SPACES_IN_EMPTY_BRACKETS', (sourceText) =>
      normalizeTextLiteralSpacing(sourceText, {
        separateFromKeywords: booleanSetting(request, 'SPACES_IN_EMPTY_BRACKETS', 'separateFromKeywords') ?? true,
        separateFromOperators: booleanSetting(request, 'SPACES_IN_EMPTY_BRACKETS', 'separateFromOperators') ?? true,
        separateFromComments: booleanSetting(request, 'SPACES_IN_EMPTY_BRACKETS', 'separateFromComments') ?? true,
      }),
    );
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'SPACE_BEFORE_PERIOD', (sourceText) =>
      removeSpaceBeforePunctuation(sourceText, {
        executeOnComma: booleanSetting(request, 'SPACE_BEFORE_PERIOD', 'executeOnComma') ?? true,
        executeOnPeriod: booleanSetting(request, 'SPACE_BEFORE_PERIOD', 'executeOnPeriod') ?? true,
      }),
    );
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'SPACE_AROUND_COMMENT_SIGN', (sourceText) =>
      normalizeCommentSignSpacing(sourceText, {
        spaceBeforeCommentSign: booleanSetting(request, 'SPACE_AROUND_COMMENT_SIGN', 'spaceBeforeCommentSign') ?? true,
        spaceAfterCommentSign: booleanSetting(request, 'SPACE_AROUND_COMMENT_SIGN', 'spaceAfterCommentSign') ?? true,
      }),
    );
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'ASSERT_PARAMETER_ORDER', standardizeSimpleAssertEqualsParameterOrder);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'COMMENT_TYPE', convertUnambiguousAsteriskComments);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'STRING_TEMPLATE', replaceSimpleStringConcatenations);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'ASSERT_EQUALS_BOOLEAN', simplifyAssertEqualsBoolean);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'ASSERT_EQUALS_SUBRC', simplifyAssertEqualsSubrc);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'ASSERT_CLASS', (sourceText) =>
      replaceSimpleAssertWithClass(sourceText, stringSetting(request, 'ASSERT_CLASS', 'assertClassName') ?? 'cx_assert'),
    );
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'NEEDLESS_PARENTHESES', removeSimpleLogicalParentheses);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'CHECK_IN_LOOP', convertSimpleChecksInLoops);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'CHECK_OUTSIDE_LOOP', convertSimpleChecksOutsideLoops);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'CALL_METHOD', removeSimpleCallMethod);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'ADD_TO_ETC', replaceSimpleAddToEtc);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'CALCULATION_ASSIGNMENT', normalizeSimpleCalculationAssignments);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'CAMEL_CASE_IN_CDS_TEST', addNoWherePseudoCommentToSimpleCdsTestSelect);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'CREATE_OBJECT', simplifyCreateObject);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'DESCRIBE_TABLE', replaceTerminalDescribeTableLines);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'CONDENSE', replaceDeclaredCondense);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'EMPTY_COMMAND', removeStandaloneEmptyCommands);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'END_OF_COMMENT', removeRedundantMethodEndComments);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'EQUALS_SIGN_CHAIN', splitSimpleEqualsSignChains);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'EXIT_OUTSIDE_LOOP', replaceExitOutsideLoops);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'IF_BLOCK_AT_METHOD_END', replaceSimpleIfBlockAtMethodEnd);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'IF_BLOCK_AT_LOOP_END', replaceSimpleIfBlockAtLoopEnd);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'MOVE_TO', simplifyMoveTo);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'PRAGMA_POSITION', moveTrailingPragmasBeforePeriod);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'PSEUDO_COMMENT', replaceSimplePseudoComments);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'TYPO', correctUnambiguousCommentTypos);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'TRANSLATE', replaceDeclaredTranslateCase);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'RAISE_TYPE', simplifyRaiseType);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'READ_TABLE', replaceSimpleReadTableAssigning);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'RECEIVING_KEYWORD', removeSimpleReceiving);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'COMPARISON_OPERATOR', normalizeComparisonOperators);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'EXPORTING_KEYWORD', removeOptionalExporting);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'NOT_IS', normalizeNotIs);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'LOGICAL_OPERATOR_POSITION', moveTerminalLogicalOperators);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'SELF_REFERENCE_ME', removeDirectMethodSelfReferences);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'VALUE_STATEMENT', shortenSimpleValueStatements);
    cleanedCode = applyRule(request, cleanedCode, appliedRules, 'UPPER_AND_LOWER_CASE', uppercaseStandaloneStatementKeywords);

    return {
      cleanedCode,
      appliedRules,
      stats: {
        changedLineCount: countChangedLines(request.sourceText, cleanedCode),
        appliedRuleCount: appliedRules.length,
        processingTimeMs: Date.now() - startedAt,
      },
    };
  }

  listRules(): readonly RuleMetadata[] {
    return [...EMPTY_LINE_RULES, ...SPACE_RULES, ...DECLARATION_RULES, ...SYNTAX_RULES];
  }
}

function applyRule(
  request: CleanupRequest,
  sourceText: string,
  appliedRules: AppliedRule[],
  ruleId: string,
  apply: (sourceText: string) => string,
): string {
  const metadata = ruleMetadata(ruleId);
  const enabled = request.profile.rules[ruleId]?.enabled ?? metadata?.defaultEnabled ?? true;
  if (!enabled || !meetsMinimumRelease(request.abapRelease, metadata?.minimumAbapRelease)) {
    return sourceText;
  }
  const cleanedCode = apply(sourceText);
  if (cleanedCode !== sourceText) {
    const changedRange = calculateChangedRange(sourceText, cleanedCode);
    appliedRules.push({ ruleId, displayName: ruleDisplayName(ruleId), ...changedRange });
  }
  return cleanedCode;
}

function ruleMetadata(ruleId: string): RuleMetadata | undefined {
  return [...EMPTY_LINE_RULES, ...SPACE_RULES, ...DECLARATION_RULES, ...SYNTAX_RULES].find((rule) => rule.id === ruleId);
}

function meetsMinimumRelease(abapRelease: string | undefined, minimumRelease: number | undefined): boolean {
  if (minimumRelease === undefined || abapRelease === undefined) return true;
  const release = Number.parseInt(abapRelease.replace(/\D/g, ''), 10);
  return Number.isNaN(release) || release >= minimumRelease;
}

function booleanSetting(request: CleanupRequest, ruleId: string, settingName: string): boolean | undefined {
  const value = request.profile.rules[ruleId]?.settings[settingName];
  return typeof value === 'boolean' ? value : undefined;
}

function stringSetting(request: CleanupRequest, ruleId: string, settingName: string): string | undefined {
  const value = request.profile.rules[ruleId]?.settings[settingName];
  return typeof value === 'string' ? value : undefined;
}

function integerSetting(request: CleanupRequest, ruleId: string, settingName: string): number | undefined {
  const value = request.profile.rules[ruleId]?.settings[settingName];
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 20 ? value : undefined;
}

function ruleDisplayName(ruleId: string): string {
  return [...EMPTY_LINE_RULES, ...SPACE_RULES, ...DECLARATION_RULES, ...SYNTAX_RULES].find((rule) => rule.id === ruleId)?.displayName ?? ruleId;
}

function createResponse(sourceText: string, appliedRules: readonly AppliedRule[], startedAt: number): CleanupResponse {
  return {
    cleanedCode: sourceText,
    appliedRules,
    stats: { changedLineCount: 0, appliedRuleCount: 0, processingTimeMs: Date.now() - startedAt },
  };
}

function countChangedLines(sourceText: string, cleanedCode: string): number {
  const sourceLines = sourceText.split(/\r?\n/);
  const cleanedLines = cleanedCode.split(/\r?\n/);
  let count = 0;
  for (let index = 0; index < Math.max(sourceLines.length, cleanedLines.length); index += 1) {
    if (sourceLines[index] !== cleanedLines[index]) {
      count += 1;
    }
  }
  return count;
}

function calculateChangedRange(sourceText: string, cleanedCode: string): Pick<AppliedRule, 'startLine' | 'endLine' | 'startColumn' | 'endColumn'> {
  const sourceLines = sourceText.split(/\r?\n/);
  const cleanedLines = cleanedCode.split(/\r?\n/);
  let startLine = 0;
  while (startLine < sourceLines.length && startLine < cleanedLines.length && sourceLines[startLine] === cleanedLines[startLine]) startLine += 1;
  if (startLine === sourceLines.length && startLine === cleanedLines.length) {
    return { startLine: 1, endLine: sourceLines.length, startColumn: 0, endColumn: sourceLines.at(-1)?.length ?? 0 };
  }

  let sourceEndLine = sourceLines.length - 1;
  let cleanedEndLine = cleanedLines.length - 1;
  while (sourceEndLine >= startLine && cleanedEndLine >= startLine && sourceLines[sourceEndLine] === cleanedLines[cleanedEndLine]) {
    sourceEndLine -= 1;
    cleanedEndLine -= 1;
  }
  const endLine = Math.min(Math.max(startLine, sourceEndLine), sourceLines.length - 1);
  let startOffset = 0;
  while (startOffset < sourceText.length && startOffset < cleanedCode.length && sourceText[startOffset] === cleanedCode[startOffset]) startOffset += 1;
  let commonSuffixLength = 0;
  while (commonSuffixLength < sourceText.length - startOffset && commonSuffixLength < cleanedCode.length - startOffset
    && sourceText[sourceText.length - 1 - commonSuffixLength] === cleanedCode[cleanedCode.length - 1 - commonSuffixLength]) {
    commonSuffixLength += 1;
  }
  const endOffset = Math.max(startOffset + 1, sourceText.length - commonSuffixLength);
  const start = positionAt(sourceText, startOffset);
  const end = positionAt(sourceText, Math.min(endOffset, sourceText.length));
  return { startLine: startLine + 1, endLine: endLine + 1, startColumn: start.column, endColumn: end.column };
}

function positionAt(sourceText: string, offset: number): { readonly line: number; readonly column: number } {
  const preceding = sourceText.slice(0, offset);
  const lineStart = preceding.lastIndexOf('\n') + 1;
  return { line: preceding.split('\n').length, column: offset - lineStart };
}
