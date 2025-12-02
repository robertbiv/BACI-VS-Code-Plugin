import * as vscode from 'vscode';

function normalizeSpaces(line: string, enabled: boolean): string {
  // space around operators =, +, -, *, /, <<, >>
  const s = enabled
    ? line
        .replace(/\s*([=+\-*/])\s*/g, ' $1 ')
        .replace(/\s*([<>]{2})\s*/g, ' $1 ')
    : line;
  return s.replace(/\s{2,}/g, ' ').replace(/\s*;\s*$/g, ';');
}

function formatIndent(lines: string[], size: number): string[] {
  let indent = 0;
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line.endsWith('}') || /^}/.test(line)) {
      indent = Math.max(0, indent - 1);
    }
    const indented = `${' '.repeat(size * indent)}${line}`;
    out.push(indented);
    if (line.endsWith('{')) {
      indent++;
    }
  }
  return out;
}

export function formatDocument(document: vscode.TextDocument): vscode.TextEdit[] {
  const fullRange = new vscode.Range(
    new vscode.Position(0, 0),
    new vscode.Position(document.lineCount, 0)
  );
  const text = document.getText();
  const lines = text.split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('baci');
  const spaceOps = cfg.get<boolean>('format.spaceAroundOperators', true);
  const indentSize = cfg.get<number>('format.indentSize', 2);
  const normalized = lines.map(l => normalizeSpaces(l, spaceOps));
  const indented = formatIndent(normalized, indentSize);
  const rejoined = indented.join('\n') + (text.endsWith('\n') ? '\n' : '');
  return [vscode.TextEdit.replace(fullRange, rejoined)];
}
