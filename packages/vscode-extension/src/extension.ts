import * as vscode from 'vscode';
import { createCleanupEngine, expandAbapRange, type CleanupRangeExpandMode, type CleanupRequest, type ResolvedProfile, type ResolvedRule } from '@abap-cleaner/core';

const engine = createCleanupEngine();
const RULE_IDS = ['CDS_TEST_CLASS_LINES', 'EMPTY_LINES_IN_CLASS_DEFINITION', 'EMPTY_LINES_OUTSIDE_METHODS', 'EMPTY_LINES_WITHIN_METHODS', 'ONE_COMMAND_PER_LINE', 'NEEDLESS_SPACES', 'CLOSING_BRACKETS_POSITION', 'SPACES_IN_EMPTY_BRACKETS', 'SPACE_BEFORE_PERIOD', 'SPACE_AROUND_COMMENT_SIGN', 'ABAP_DOC_LANG', 'ABAP_DOC_PARAMETERS', 'ESCAPE_CHAR_FOR_PARAMS', 'IMPLICIT_TYPE', 'NEEDLESS_CLEAR', 'CHAIN_OF_ONE', 'CLASS_DEFINITION', 'DECLARATION_CHAIN', 'EMPTY_SECTIONS', 'ASSERT_CLASS', 'ASSERT_EQUALS_BOOLEAN', 'ASSERT_EQUALS_SUBRC', 'ASSERT_PARAMETER_ORDER', 'CAMEL_CASE_IN_CDS_TEST', 'COMMENT_TYPE', 'STRING_TEMPLATE', 'CHECK_IN_LOOP', 'CHECK_OUTSIDE_LOOP', 'CALL_METHOD', 'ADD_TO_ETC', 'CALCULATION_ASSIGNMENT', 'CREATE_OBJECT', 'CONDENSE', 'DESCRIBE_TABLE', 'EMPTY_COMMAND', 'END_OF_COMMENT', 'EQUALS_SIGN_CHAIN', 'EXIT_OUTSIDE_LOOP', 'IF_BLOCK_AT_METHOD_END', 'IF_BLOCK_AT_LOOP_END', 'MOVE_TO', 'NEEDLESS_PARENTHESES', 'PRAGMA_POSITION', 'PSEUDO_COMMENT', 'RAISE_TYPE', 'READ_TABLE', 'RECEIVING_KEYWORD', 'COMPARISON_OPERATOR', 'EXPORTING_KEYWORD', 'NOT_IS', 'LOGICAL_OPERATOR_POSITION', 'SELF_REFERENCE_ME', 'UPPER_AND_LOWER_CASE', 'VALUE_STATEMENT', 'TRANSLATE', 'TYPO'] as const;
const DIAGNOSTIC_SOURCE = 'ABAP Cleaner';
const FIX_ALL_KIND = vscode.CodeActionKind.SourceFixAll.append('abapCleaner');
const diagnostics = vscode.languages.createDiagnosticCollection('abap-cleaner');
const selector: vscode.DocumentSelector = [
  { language: 'abap' },
  { pattern: '**/*.abap' },
  { pattern: '**/*.acds' },
  { pattern: '**/*.asddls' },
  { pattern: '**/*.asddlxs' },
  { pattern: '**/*.asdcls' },
  { pattern: '**/*.asbdef' },
];

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    diagnostics,
    vscode.languages.registerDocumentFormattingEditProvider(selector, {
      provideDocumentFormattingEdits(document, _options, cancellationToken) {
        if (cancellationToken.isCancellationRequested) {
          return [];
        }

        const sourceText = document.getText();
  const response = engine.clean(cleanupRequest(sourceText, document.eol, document.uri));
        if (cancellationToken.isCancellationRequested || response.cleanedCode === sourceText) {
          return [];
        }

        return [vscode.TextEdit.replace(fullDocumentRange(document), response.cleanedCode ?? sourceText)];
      },
    }),
    vscode.languages.registerDocumentRangeFormattingEditProvider(selector, {
      provideDocumentRangeFormattingEdits(document, range, _options, cancellationToken) {
        if (cancellationToken.isCancellationRequested) return [];
        const expanded = statementRange(document, range);
        const sourceText = document.getText(expanded);
        const response = engine.clean(cleanupRequest(sourceText, document.eol, document.uri));
        return response.cleanedCode === sourceText ? [] : [vscode.TextEdit.replace(expanded, response.cleanedCode ?? sourceText)];
      },
    }),
    vscode.languages.registerCodeActionsProvider(selector, {
      provideCodeActions(document, _range, context, cancellationToken) {
        if (cancellationToken.isCancellationRequested) return [];
        const actions = context.diagnostics.flatMap((diagnostic) => {
          const ruleId = typeof diagnostic.code === 'string' ? diagnostic.code : undefined;
          if (diagnostic.source !== DIAGNOSTIC_SOURCE || !isRuleId(ruleId)) return [];
          const sourceText = document.getText();
          const response = engine.clean({
            ...cleanupRequest(sourceText, document.eol, document.uri),
            profile: resolveSingleRuleProfile(document.uri, ruleId),
          });
          if (response.cleanedCode === sourceText) return [];
          const action = new vscode.CodeAction(`Apply: ${diagnostic.message}`, vscode.CodeActionKind.QuickFix);
          action.diagnostics = [diagnostic];
          action.isPreferred = true;
          action.edit = new vscode.WorkspaceEdit();
          action.edit.replace(document.uri, fullDocumentRange(document), response.cleanedCode ?? sourceText);
          return [action];
        });
        if (context.only?.contains(FIX_ALL_KIND)) {
          const sourceText = document.getText();
          const response = engine.clean(cleanupRequest(sourceText, document.eol, document.uri));
          if (response.cleanedCode !== sourceText) {
            const action = new vscode.CodeAction('Apply all ABAP Cleaner rules', FIX_ALL_KIND);
            action.edit = new vscode.WorkspaceEdit();
            action.edit.replace(document.uri, fullDocumentRange(document), response.cleanedCode ?? sourceText);
            actions.push(action);
          }
        }
        return actions;
      },
    }, { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix, FIX_ALL_KIND] }),
    vscode.workspace.onDidOpenTextDocument(updateDiagnostics),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (lintRunMode(event.document) === 'onType') {
        updateDiagnostics(event.document);
      }
    }),
    vscode.workspace.onDidSaveTextDocument(updateDiagnostics),
    vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri)),
  );

  for (const document of vscode.workspace.textDocuments) {
    updateDiagnostics(document);
  }
}

export function deactivate(): void {
}

function cleanupRequest(sourceText: string, eol: vscode.EndOfLine, resource: vscode.Uri): CleanupRequest {
  const configuration = vscode.workspace.getConfiguration('abapCleaner', resource);
  const abapRelease = configuration.get<string | null>('abapRelease', null);
  return {
    sourceText,
    expandMode: 'FULL_DOCUMENT',
    profile: resolveProfile(resource),
    ...(abapRelease === null ? {} : { abapRelease }),
    lineSeparator: eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n',
  };
}

function resolveProfile(resource: vscode.Uri): ResolvedProfile {
  const configuration = vscode.workspace.getConfiguration('abapCleaner', resource);
  const name = configuration.get<'default' | 'essential'>('profile', 'default');
  const rules: Record<string, ResolvedRule> = {};

  for (const ruleId of RULE_IDS) {
    const settings: Record<string, boolean | number | string> = {};
    for (const settingName of settingNames(ruleId)) {
      const value = configuration.get<boolean | number | string | null>(`rules.${ruleId}.${settingName}`, null);
      if (value !== null) {
        settings[settingName] = value;
      }
    }
    const enabledOverride = configuration.get<boolean | null>(`rules.${ruleId}.enabled`, null);
    rules[ruleId] = {
      enabled: enabledOverride ?? (ruleId !== 'ABAP_DOC_PARAMETERS' && ruleId !== 'ADD_TO_ETC' && ruleId !== 'ASSERT_CLASS' && ruleId !== 'CALCULATION_ASSIGNMENT' && ruleId !== 'CAMEL_CASE_IN_CDS_TEST' && ruleId !== 'CDS_TEST_CLASS_LINES' && ruleId !== 'CLASS_DEFINITION' && ruleId !== 'CLOSING_BRACKETS_POSITION' && ruleId !== 'COMMENT_TYPE' && ruleId !== 'CONDENSE' && ruleId !== 'CREATE_OBJECT' && ruleId !== 'DECLARATION_CHAIN' && ruleId !== 'DESCRIBE_TABLE' && ruleId !== 'EMPTY_SECTIONS' && ruleId !== 'ESCAPE_CHAR_FOR_PARAMS' && ruleId !== 'IF_BLOCK_AT_METHOD_END' && ruleId !== 'IF_BLOCK_AT_LOOP_END' && ruleId !== 'ONE_COMMAND_PER_LINE' && ruleId !== 'RAISE_TYPE' && ruleId !== 'TRANSLATE' && ruleId !== 'UPPER_AND_LOWER_CASE' && ruleId !== 'VALUE_STATEMENT' && (name === 'default' || ruleId === 'EMPTY_LINES_OUTSIDE_METHODS' || ruleId === 'EMPTY_LINES_WITHIN_METHODS' || ruleId === 'SPACE_BEFORE_PERIOD' || ruleId === 'ASSERT_EQUALS_BOOLEAN' || ruleId === 'ASSERT_EQUALS_SUBRC' || ruleId === 'CALL_METHOD' || ruleId === 'MOVE_TO' || ruleId === 'EXPORTING_KEYWORD' || ruleId === 'NOT_IS' || ruleId === 'READ_TABLE' || ruleId === 'SELF_REFERENCE_ME')),
      settings,
    };
  }

  return { name, rules };
}

function resolveSingleRuleProfile(resource: vscode.Uri, selectedRuleId: (typeof RULE_IDS)[number]): ResolvedProfile {
  const profile = resolveProfile(resource);
  const rules: Record<string, ResolvedRule> = {};
  for (const ruleId of RULE_IDS) {
    rules[ruleId] = { ...profile.rules[ruleId]!, enabled: ruleId === selectedRuleId };
  }
  return { name: profile.name, rules };
}

function isRuleId(ruleId: string | undefined): ruleId is (typeof RULE_IDS)[number] {
  return ruleId !== undefined && RULE_IDS.some((candidate) => candidate === ruleId);
}

function settingNames(ruleId: (typeof RULE_IDS)[number]): readonly string[] {
  if (ruleId === 'EMPTY_LINES_IN_CLASS_DEFINITION') {
    return ['maxEmptyLines'];
  }
  if (ruleId === 'EMPTY_LINES_OUTSIDE_METHODS') {
    return ['emptyLinesBetweenClasses'];
  }
  if (ruleId === 'EMPTY_LINES_WITHIN_METHODS') {
    return ['maxEmptyLinesWithinMethods'];
  }
  if (ruleId === 'CHAIN_OF_ONE') {
    return ['processSimpleChains'];
  }
  if (ruleId === 'NEEDLESS_SPACES') {
    return ['processEmptyBrackets'];
  }
  if (ruleId === 'SPACES_IN_EMPTY_BRACKETS') {
    return ['separateFromKeywords', 'separateFromOperators', 'separateFromComments'];
  }
  if (ruleId === 'SPACE_BEFORE_PERIOD') {
    return ['executeOnComma', 'executeOnPeriod'];
  }
  if (ruleId === 'SPACE_AROUND_COMMENT_SIGN') {
    return ['spaceBeforeCommentSign', 'spaceAfterCommentSign'];
  }
  if (ruleId === 'ASSERT_CLASS') {
    return ['assertClassName'];
  }
  return [];
}

function fullDocumentRange(document: vscode.TextDocument): vscode.Range {
  return new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
}

function statementRange(document: vscode.TextDocument, range: vscode.Range): vscode.Range {
  const expanded = expandAbapRange(document.getText(), range.start.line + 1, range.end.line + 1, rangeExpansionMode(document.uri));
  if (expanded === undefined) return range;
  const lastStatementLine = expanded.endLine - 1;
  const end = lastStatementLine < document.lineCount - 1
    ? new vscode.Position(lastStatementLine + 1, 0)
    : document.lineAt(lastStatementLine).range.end;
  return new vscode.Range(expanded.startLine - 1, 0, end.line, end.character);
}

function rangeExpansionMode(resource: vscode.Uri): CleanupRangeExpandMode {
  return vscode.workspace.getConfiguration('abapCleaner', resource)
    .get<CleanupRangeExpandMode>('rangeFormatting.expandMode', 'FULL_STATEMENT');
}

function updateDiagnostics(document: vscode.TextDocument): void {
  if (!vscode.languages.match(selector, document)) {
    return;
  }
  const configuration = vscode.workspace.getConfiguration('abapCleaner', document.uri);
  if (!configuration.get('lint.enabled', true)) {
    diagnostics.delete(document.uri);
    return;
  }

  const sourceText = document.getText();
  const response = engine.clean(cleanupRequest(sourceText, document.eol, document.uri));
  diagnostics.set(document.uri, response.appliedRules.map((rule) => {
    const diagnostic = new vscode.Diagnostic(
      diagnosticRange(document, rule.startLine, rule.endLine, rule.startColumn, rule.endColumn),
      rule.displayName,
      lintSeverity(configuration.get('lint.severity', 'information')),
    );
    diagnostic.source = DIAGNOSTIC_SOURCE;
    diagnostic.code = rule.ruleId;
    return diagnostic;
  }));
}

function diagnosticRange(document: vscode.TextDocument, startLine: number, endLine: number, startColumn?: number, endColumn?: number): vscode.Range {
  const first = Math.max(0, Math.min(startLine - 1, document.lineCount - 1));
  const last = Math.max(first, Math.min(endLine - 1, document.lineCount - 1));
  if (startColumn !== undefined && endColumn !== undefined && first === last) {
    const line = document.lineAt(first);
    const start = Math.max(0, Math.min(startColumn, line.range.end.character));
    const end = Math.max(start + 1, Math.min(endColumn, line.range.end.character));
    return new vscode.Range(first, start, first, end);
  }
  return new vscode.Range(document.lineAt(first).range.start, document.lineAt(last).range.end);
}

function lintRunMode(document: vscode.TextDocument): 'onSave' | 'onType' {
  return vscode.workspace.getConfiguration('abapCleaner', document.uri).get('lint.run', 'onSave');
}

function lintSeverity(value: string): vscode.DiagnosticSeverity {
  switch (value) {
    case 'hint': return vscode.DiagnosticSeverity.Hint;
    case 'warning': return vscode.DiagnosticSeverity.Warning;
    case 'error': return vscode.DiagnosticSeverity.Error;
    default: return vscode.DiagnosticSeverity.Information;
  }
}
