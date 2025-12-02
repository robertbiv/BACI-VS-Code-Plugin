export interface BaciParseResult {
  functions: { name: string; returnType: string; line: number }[];
  hasMain: boolean;
  tokens: { type: string; value: string; line: number; col: number }[];
  cobeginLines: number[];
  errors: { message: string; line: number; col?: number }[];
  semaphores: { name: string; type: 'semaphore' | 'binarysem'; line: number; init?: number }[];
}

// Lightweight line-based parser for BACI C-- per docs
export function parseBaci(text: string): BaciParseResult {
  const lines = text.split(/\r?\n/);
  const functions: { name: string; returnType: string; line: number }[] = [];
  const tokens: { type: string; value: string; line: number; col: number }[] = [];
  const errors: { message: string; line: number; col?: number }[] = [];
  const cobeginLines: number[] = [];
  const semaphores: { name: string; type: 'semaphore' | 'binarysem'; line: number; init?: number }[] = [];

  const funcDecl = /\b(void|int)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
  const stringVarNoLen = /\bstring\b\s+[A-Za-z_][A-Za-z0-9_]*\s*(?:[;=])/;
  const stringLen = /string\s*\[\s*\d+\s*\]\s+[A-Za-z_][A-Za-z0-9_]*/;
  const semDecl = /(semaphore|binarysem)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:=\s*(\d+)\s*)?;/;
  const initialsemCall = /initialsem\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([0-9]+)\s*\)/;

  let braceDepth = 0;
  let cobeginDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Collect tokens (very rough)
    const words = line.match(/[A-Za-z_][A-Za-z0-9_]*|\d+|\S/g) || [];
    let offset = 0;
    for (const w of words) {
      const col = line.indexOf(w, offset);
      offset = col + w.length;
      const type = /\d+/.test(w) ? 'number' : /[{}()]/.test(w) ? 'punct' : 'ident';
      tokens.push({ type, value: w, line: i, col });
    }

    // Track braces
    if (trimmed.endsWith('{')) braceDepth++;
    if (trimmed.startsWith('}')) braceDepth = Math.max(0, braceDepth - 1);

    // Functions
    const fm = line.match(funcDecl);
    if (fm) {
      functions.push({ returnType: fm[1], name: fm[2], line: i });
    }

    // cobegin
    if (/\bcobegin\b/.test(line)) {
      cobeginLines.push(i);
      if (cobeginDepth > 0) {
        errors.push({ message: 'Nested cobegin block not allowed', line: i });
      }
      cobeginDepth++;
    }
    if (/^\s*\}/.test(line) && cobeginDepth > 0) {
      cobeginDepth--;
    }

    // Strings without length
    if (stringVarNoLen.test(line) && !stringLen.test(line)) {
      errors.push({ message: 'String variable must declare length: string[20] name;', line: i });
    }

    // semaphore declarations
    const sd = line.match(semDecl);
    if (sd) {
      const type = sd[1] as 'semaphore' | 'binarysem';
      const name = sd[2];
      const init = sd[3] ? Number(sd[3]) : undefined;
      semaphores.push({ name, type, line: i, init });
      if (type === 'semaphore' && init !== undefined && init < 0) {
        errors.push({ message: 'semaphore must be non-negative', line: i });
      }
      if (type === 'binarysem' && init !== undefined && !(init === 0 || init === 1)) {
        errors.push({ message: 'binarysem must be initialized to 0 or 1', line: i });
      }
    }

    // initialsem checks
    const isCall = line.match(initialsemCall);
    if (isCall) {
      const name = isCall[1];
      const val = Number(isCall[2]);
      const sem = semaphores.find(s => s.name === name);
      if (sem) {
        if (sem.type === 'semaphore' && val < 0) {
          errors.push({ message: 'initialsem: semaphore value must be non-negative', line: i });
        }
        if (sem.type === 'binarysem' && !(val === 0 || val === 1)) {
          errors.push({ message: 'initialsem: binarysem value must be 0 or 1', line: i });
        }
      }
    }

    // For loop index declared in header
    if (/for\s*\(\s*int\s+[A-Za-z_][A-Za-z0-9_]*/.test(line)) {
      errors.push({ message: 'For-loop index cannot be declared in header; declare at block start', line: i });
    }
  }

  const hasMain = functions.some(f => f.name === 'main');
  if (!hasMain) {
    errors.push({ message: 'Missing main() function', line: 0 });
  } else {
    const lastFunc = [...functions].pop();
    if (lastFunc && lastFunc.name !== 'main') {
      errors.push({ message: 'main() must be the last function', line: lastFunc.line });
    }
  }

  return { functions, hasMain, tokens, cobeginLines, errors, semaphores };
}
