import * as vscode from 'vscode';
import { provideDiagnostics } from './diagnostics';
import { parseBaci } from './parser';
import { BaciCodeActionsProvider } from './codeActions';
import { formatDocument } from './formatter';

let isActivated = false;

export function activate(context: vscode.ExtensionContext) {
  if (isActivated) {
    console.warn('BACI extension already activated, skipping duplicate activation');
    return;
  }
  isActivated = true;

  const diagCollection = vscode.languages.createDiagnosticCollection('baci');
  context.subscriptions.push(diagCollection);

  const refreshDiagnostics = (doc: vscode.TextDocument) => {
    if (doc.languageId === 'baci') {
      try {
        const parse = parseBaci(doc.getText());
        const diags = provideDiagnostics(doc, parse);
        diagCollection.set(doc.uri, diags);
      } catch (error) {
        console.error('BACI diagnostics error:', error);
      }
    }
  };

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(refreshDiagnostics),
    vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document)),
    vscode.workspace.onDidSaveTextDocument(refreshDiagnostics)
  );

  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(vscode.window.activeTextEditor.document);
  }

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider('baci', {
      provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
        return formatDocument(document);
      }
    })
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('baci', new BaciCodeActionsProvider(), {
      providedCodeActionKinds: BaciCodeActionsProvider.providedKinds
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('baci-vscode.formatDocument', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'baci') {
        const edits = formatDocument(editor.document);
        const wsEdit = new vscode.WorkspaceEdit();
        edits.forEach(edit => wsEdit.replace(editor.document.uri, edit.range, edit.newText!));
        return vscode.workspace.applyEdit(wsEdit);
      }
    })
  );
}

export function deactivate() {
  isActivated = false;
}
