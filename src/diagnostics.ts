import * as vscode from 'vscode';
import type { BaciParseResult } from './parser';

const BACI_TYPES = new Set(['int', 'char', 'string']);

export function provideDiagnostics(doc: vscode.TextDocument, parsed?: BaciParseResult): vscode.Diagnostic[] {
  const diags: vscode.Diagnostic[] = [];
  const text = doc.getText();
  const lines = text.split(/\r?\n/);

  // Use parsed errors if provided
  if (parsed) {
    for (const err of parsed.errors) {
      const i = Math.min(Math.max(err.line, 0), lines.length ? lines.length - 1 : 0);
      diags.push(new vscode.Diagnostic(
        new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, lines[i]?.length ?? 0)),
        err.message,
        /must|Missing|not allowed|cannot/.test(err.message) ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
      ));
    }
  }

  // Additional heuristic: illegal types

  lines.forEach((line, i) => {
    const decl = line.match(/\b([A-Za-z_][A-Za-z0-9_]*)\b\s+[A-Za-z_][A-Za-z0-9_]*\s*(?:[;=\[])/);
    if (decl) {
      const type = decl[1];
      if (!BACI_TYPES.has(type) && type !== 'semaphore' && type !== 'binarysem' && type !== 'monitor' && type !== 'condition' && type !== 'typedef' && type !== 'extern' && type !== 'const' && type !== 'void') {
        diags.push(new vscode.Diagnostic(
          new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length)),
          `Type '${type}' is not supported in BACI C--`,
          vscode.DiagnosticSeverity.Warning
        ));
      }
    }
  });

  return diags;
}
