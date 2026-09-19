import * as vscode from 'vscode';
import { createCleanupEngine, expandAbapRange, isRuleActiveInProfile, type CleanupRangeExpandMode, type CleanupRequest, type ResolvedProfile, type ResolvedRule } from '@abap-cleaner/core';

const engine = createCleanupEngine();
const RULES = engine.listRules();
const RULES_BY_ID = new Map(RULES.map((rule) => [rule.id, rule]));
const DIAGNOSTIC_SOURCE = 'ABAP Cleaner';
const UPSTREAM_DOCS_BASE = 'https://github.com/SAP/abap-cleaner/blob/main/docs/rules';
const FIX_ALL_KIND = vscode.CodeActionKind.SourceFixAll.append('abapCleaner');
const diagnostics = vscode.languages.createDiagnosticCollection('abap-cleaner');
const outputChannel = vscode.window.createOutputChannel('ABAP Cleaner');
const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
statusBarItem.command = 'abapCleaner.showOutput';
const selector: vscode.DocumentSelector = [
  { language: 'abap' },
  { pattern: '**/*.abap' },
  { pattern: '**/*.acds' },
  { pattern: '**/*.asddls' },
  { pattern: '**/*.asddlxs' },
  { pattern: '**/*.asdcls' },
  { pattern: '**/*.asbdef' },
];
const WORKSPACE_GLOB = '**/*.{abap,acds,asddls,asddlxs,asdcls,asbdef}';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    diagnostics,
    outputChannel,
    statusBarItem,
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
          const ruleId = diagnosticRuleId(diagnostic);
          if (diagnostic.source !== DIAGNOSTIC_SOURCE || !isRuleId(ruleId)) return [];
          const sourceText = document.getText();
          const response = engine.clean({
            ...cleanupRequest(sourceText, document.eol, document.uri),
            profile: resolveSingleRuleProfile(document.uri, ruleId),
          });

          const disableAction = new vscode.CodeAction(`Disable rule ${ruleId} for this workspace`, vscode.CodeActionKind.QuickFix);
          disableAction.diagnostics = [diagnostic];
          disableAction.command = { command: 'abapCleaner.disableRule', title: 'Disable rule', arguments: [ruleId] };

          if (response.cleanedCode === sourceText) return [disableAction];
          const applyAction = new vscode.CodeAction(`Apply: ${diagnostic.message}`, vscode.CodeActionKind.QuickFix);
          applyAction.diagnostics = [diagnostic];
          applyAction.isPreferred = true;
          applyAction.edit = new vscode.WorkspaceEdit();
          applyAction.edit.replace(document.uri, fullDocumentRange(document), response.cleanedCode ?? sourceText);
          return [applyAction, disableAction];
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
    vscode.window.onDidChangeActiveTextEditor((editor) => updateStatusBarItem(editor?.document)),
    vscode.commands.registerCommand('abapCleaner.cleanWorkspace', cleanWorkspace),
    vscode.commands.registerCommand('abapCleaner.disableRule', disableRule),
    vscode.commands.registerCommand('abapCleaner.formatDocument', () => vscode.commands.executeCommand('editor.action.formatDocument')),
    vscode.commands.registerCommand('abapCleaner.formatSelection', () => vscode.commands.executeCommand('editor.action.formatSelection')),
    vscode.commands.registerCommand('abapCleaner.exportProfile', exportProfile),
    vscode.commands.registerCommand('abapCleaner.showOutput', () => outputChannel.show()),
  );

  for (const document of vscode.workspace.textDocuments) {
    updateDiagnostics(document);
  }
  updateStatusBarItem(vscode.window.activeTextEditor?.document);
}

export function deactivate(): void {
}

function trace(resource: vscode.Uri | undefined, level: 'messages' | 'verbose', message: string): void {
  const configured = vscode.workspace.getConfiguration('abapCleaner', resource).get<'off' | 'messages' | 'verbose'>('trace', 'off');
  const active = configured === 'verbose' || (configured === 'messages' && level === 'messages');
  if (active) outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
}

async function disableRule(ruleId: string): Promise<void> {
  const configuration = vscode.workspace.getConfiguration('abapCleaner');
  await configuration.update(`rules.${ruleId}.enabled`, false, vscode.ConfigurationTarget.Workspace);
}

async function exportProfile(): Promise<void> {
  const resource = vscode.window.activeTextEditor?.document.uri ?? vscode.workspace.workspaceFolders?.[0]?.uri;
  const profile = resolveProfile(resource);

  const defaultFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
  const target = await vscode.window.showSaveDialog({
    ...(defaultFolder === undefined ? {} : { defaultUri: vscode.Uri.joinPath(defaultFolder, 'abap-cleaner-profile.json') }),
    filters: { 'ABAP Cleaner profile': ['json'] },
    title: 'Export Resolved ABAP Cleaner Profile',
  });
  if (target === undefined) return;

  await vscode.workspace.fs.writeFile(target, Buffer.from(`${JSON.stringify(profile, null, 2)}\n`, 'utf8'));
  void vscode.window.showInformationMessage(`ABAP Cleaner: exported the resolved '${profile.name}' profile to ${vscode.workspace.asRelativePath(target)}.`);
}

async function cleanWorkspace(): Promise<void> {
  const files = await vscode.workspace.findFiles(WORKSPACE_GLOB);
  if (files.length === 0) {
    void vscode.window.showInformationMessage('ABAP Cleaner: no matching files found in the workspace.');
    return;
  }

  const confirmation = await vscode.window.showWarningMessage(
    `ABAP Cleaner will overwrite up to ${files.length} file(s) on disk with cleaned versions. This cannot be undone except through version control. Continue?`,
    { modal: true },
    'Clean Workspace',
  );
  if (confirmation !== 'Clean Workspace') return;

  let changedCount = 0;
  let errorCount = 0;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'ABAP Cleaner: Cleaning workspace', cancellable: true },
    async (progress, cancellationToken) => {
      const increment = files.length === 0 ? 0 : 100 / files.length;
      for (const file of files) {
        if (cancellationToken.isCancellationRequested) break;
        progress.report({ increment, message: vscode.workspace.asRelativePath(file) });
        try {
          const changed = await cleanWorkspaceFile(file);
          if (changed) changedCount += 1;
          trace(file, 'verbose', `cleanWorkspace: ${changed ? 'changed' : 'unchanged'} ${vscode.workspace.asRelativePath(file)}`);
        } catch (error) {
          errorCount += 1;
          trace(file, 'messages', `cleanWorkspace: failed to clean ${vscode.workspace.asRelativePath(file)}: ${String(error)}`);
        }
      }
    },
  );

  const summary = `ABAP Cleaner: cleaned ${changedCount} of ${files.length} file(s).`;
  trace(undefined, 'messages', `${summary} ${errorCount} error(s).`);
  if (errorCount > 0) {
    void vscode.window.showWarningMessage(`${summary} ${errorCount} file(s) could not be read or written.`);
  } else {
    void vscode.window.showInformationMessage(summary);
  }
}

async function cleanWorkspaceFile(file: vscode.Uri): Promise<boolean> {
  const bytes = await vscode.workspace.fs.readFile(file);
  const sourceText = Buffer.from(bytes).toString('utf8');
  const response = engine.clean(cleanupRequest(sourceText, sourceText.includes('\r\n') ? vscode.EndOfLine.CRLF : vscode.EndOfLine.LF, file));
  if (response.cleanedCode === undefined || response.cleanedCode === sourceText) return false;
  await vscode.workspace.fs.writeFile(file, Buffer.from(response.cleanedCode, 'utf8'));
  return true;
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

function resolveProfile(resource: vscode.Uri | undefined): ResolvedProfile {
  const configuration = vscode.workspace.getConfiguration('abapCleaner', resource);
  const name = configuration.get<'default' | 'essential'>('profile', 'default');
  const rules: Record<string, ResolvedRule> = {};

  for (const rule of RULES) {
    const settings: Record<string, boolean | number | string> = {};
    for (const setting of rule.settings) {
      const value = configuration.get<boolean | number | string | null>(`rules.${rule.id}.${setting.name}`, null);
      if (value !== null) {
        settings[setting.name] = value;
      }
    }
    const enabledOverride = configuration.get<boolean | null>(`rules.${rule.id}.enabled`, null);
    rules[rule.id] = {
      enabled: enabledOverride ?? isRuleActiveInProfile(rule, name),
      settings,
    };
  }

  return { name, rules };
}

function resolveSingleRuleProfile(resource: vscode.Uri, selectedRuleId: string): ResolvedProfile {
  const profile = resolveProfile(resource);
  const rules: Record<string, ResolvedRule> = {};
  for (const rule of RULES) {
    rules[rule.id] = { ...profile.rules[rule.id]!, enabled: rule.id === selectedRuleId };
  }
  return { name: profile.name, rules };
}

function isRuleId(ruleId: string | undefined): ruleId is string {
  return ruleId !== undefined && RULES.some((rule) => rule.id === ruleId);
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
    if (document === vscode.window.activeTextEditor?.document) statusBarItem.hide();
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
    diagnostic.code = diagnosticCode(rule.ruleId);
    return diagnostic;
  }));
  trace(document.uri, 'messages', `lint: ${response.appliedRules.length} rule(s) would apply to ${vscode.workspace.asRelativePath(document.uri)}`);

  if (document === vscode.window.activeTextEditor?.document) {
    updateStatusBarItem(document);
  }
}

function updateStatusBarItem(document: vscode.TextDocument | undefined): void {
  const enabled = document !== undefined
    && vscode.languages.match(selector, document) > 0
    && vscode.workspace.getConfiguration('abapCleaner', document.uri).get('lint.enabled', true);
  if (!enabled || document === undefined) {
    statusBarItem.hide();
    return;
  }
  const ruleHitCount = diagnostics.get(document.uri)?.length ?? 0;
  statusBarItem.text = `$(sparkle) ABAP Cleaner: ${ruleHitCount}`;
  statusBarItem.tooltip = ruleHitCount === 0
    ? 'ABAP Cleaner: no rule hits in this file'
    : `ABAP Cleaner: ${ruleHitCount} rule hit(s) in this file — click to show the log`;
  statusBarItem.show();
}

function diagnosticCode(ruleId: string): string | { readonly value: string; readonly target: vscode.Uri } {
  const docId = RULES_BY_ID.get(ruleId)?.docId;
  return docId === undefined ? ruleId : { value: ruleId, target: vscode.Uri.parse(`${UPSTREAM_DOCS_BASE}/${docId}.md`) };
}

function diagnosticRuleId(diagnostic: vscode.Diagnostic): string | undefined {
  if (typeof diagnostic.code === 'string') return diagnostic.code;
  if (typeof diagnostic.code === 'object' && diagnostic.code !== null && typeof diagnostic.code.value === 'string') {
    return diagnostic.code.value;
  }
  return undefined;
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
