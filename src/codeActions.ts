import * as vscode from 'vscode';

export class BaciCodeActionsProvider implements vscode.CodeActionProvider {
  public static readonly providedKinds = [
    vscode.CodeActionKind.QuickFix
  ];

  provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext): vscode.CodeAction[] | undefined {
    const fixes: vscode.CodeAction[] = [];
    for (const diag of context.diagnostics) {
      const msg = diag.message;
      if (/String variable must declare length/.test(msg)) {
        const fix = this.fixStringLength(document, diag.range);
        if (fix) fixes.push(fix);
      }
      if (/For-loop index cannot be declared in header/.test(msg)) {
        const fix = this.fixForHeaderIndex(document, diag.range);
        if (fix) fixes.push(fix);
      }
      if (/main\(\) must be the last function/.test(msg)) {
        const fix = this.fixMoveMainToEnd(document);
        if (fix) fixes.push(fix);
      }
    }
    return fixes;
  }

  private fixStringLength(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction | undefined {
    const lineText = document.lineAt(range.start.line).text;
    const m = lineText.match(/\bstring\b\s+([A-Za-z_][A-Za-z0-9_]*)\s*([;=])/);
    if (!m) return;
    const name = m[1];
    const suffix = m[2];
    const cfg = vscode.workspace.getConfiguration('baci');
    const len = cfg.get<number>('defaultStringLength', 20);
    const replacement = lineText.replace(/\bstring\b\s+([A-Za-z_][A-Za-z0-9_]*)\s*([;=])/, `string[${len}] ${name} ${suffix}`);
    const action = new vscode.CodeAction('Declare string length (string[20])', vscode.CodeActionKind.QuickFix);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(range.start.line, 0, range.start.line, lineText.length), replacement);
    action.edit = edit;
    action.diagnostics = [new vscode.Diagnostic(range, 'String variable must declare length', vscode.DiagnosticSeverity.Error)];
    action.isPreferred = true;
    return action;
  }

  private fixForHeaderIndex(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction | undefined {
    const lineIdx = range.start.line;
    const lineText = document.lineAt(lineIdx).text;
    const m = lineText.match(/for\s*\(\s*int\s+([A-Za-z_][A-Za-z0-9_]*)\s*=([^;]+);/);
    if (!m) return;
    const varName = m[1];
    const initExpr = m[2].trim();
    // naive insertion: add `int <name> = <expr>;` on previous line
    const declText = `int ${varName} = ${initExpr};`;
    const newFor = lineText.replace(/\(\s*int\s+([A-Za-z_][A-Za-z0-9_]*)\s*=([^;]+);/, `(${varName} = ${initExpr};`);
    const action = new vscode.CodeAction('Move loop index declaration out of header', vscode.CodeActionKind.QuickFix);
    const edit = new vscode.WorkspaceEdit();
    // insert declaration at line before, keeping same indentation
    const indent = lineText.match(/^\s*/)?.[0] ?? '';
    edit.insert(document.uri, new vscode.Position(lineIdx, 0), `${indent}${declText}\n`);
    edit.replace(document.uri, new vscode.Range(lineIdx, 0, lineIdx, lineText.length), newFor);
    action.edit = edit;
    action.diagnostics = [new vscode.Diagnostic(range, 'For-loop index cannot be declared in header', vscode.DiagnosticSeverity.Error)];
    action.isPreferred = true;
    return action;
  }

  private fixMoveMainToEnd(document: vscode.TextDocument): vscode.CodeAction | undefined {
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    // find main declaration line
    let mainLine = -1;
    let lastFuncLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/\b(void|int)\s+main\s*\(/.test(lines[i])) mainLine = i;
      if (/\b(void|int)\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(lines[i])) lastFuncLine = i;
    }
    if (mainLine < 0 || lastFuncLine === mainLine) return;
    // move the main block to end (rough heuristic: from main line until matching brace close)
    let start = mainLine;
    let end = mainLine;
    let depth = 0;
    for (let i = mainLine; i < lines.length; i++) {
      if (/{/.test(lines[i])) depth++;
      if (/}/.test(lines[i])) depth--;
      end = i;
      if (depth === 0 && i > mainLine) break;
    }
    const mainBlock = lines.slice(start, end + 1).join('\n');
    const before = lines.slice(0, start).join('\n');
    const after = lines.slice(end + 1).join('\n');
    const newText = `${before}\n${after}\n${mainBlock}`.replace(/\n{3,}/g, '\n\n');

    const action = new vscode.CodeAction('Move main() to end of file', vscode.CodeActionKind.QuickFix);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount, 0)), newText);
    action.edit = edit;
    action.isPreferred = false;
    return action;
  }
}
