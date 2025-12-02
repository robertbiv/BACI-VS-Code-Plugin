# BACI C-- Support for VS Code

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/robertbiv.baci-vscode)](https://marketplace.visualstudio.com/items?itemName=robertbiv.baci-vscode)

Provides formatting and basic error diagnostics for BACI C-- (`*.cm`) files.

**[Install from VS Code Marketplace →](https://marketplace.visualstudio.com/items?itemName=robertbiv.baci-vscode)**

## Installation

**From VS Code Marketplace:**
- Open VS Code → Extensions (Ctrl+Shift+X) → Search "BACI C--" → Install

**From Command Line:**
```pwsh
code --install-extension robertbiv.baci-vscode
```

**Manual Install (Offline):**
1. Download the latest `.vsix` from [GitHub Releases](https://github.com/robertbiv/BACI-VS-Code-Plugin/releases)
2. Install via command line:
   ```pwsh
   code --install-extension baci-vscode-0.1.0.vsix
   ```
3. Or in VS Code: Extensions → `...` menu → Install from VSIX

## Features
- Syntax highlighting (basic TextMate grammar)
- Diagnostics for common BACI rules:
  - `main()` must be last function
  - For-loop index cannot be declared in header
  - Only supported types (int, char, string, semaphore, binarysem)
  - String declarations require explicit length (`string[20] name;`)
  - Nested `cobegin` blocks not allowed
- Formatter: normalizes spaces around operators, indents braces C-style.

## Usage
- Open a `.cm` file; diagnostics show in Problems panel.
- Run `Format Document` or the command `BACI: Format Document`.

## Build & Run
```pwsh
# In the extension root
npm install
npm run build
# Press F5 in VS Code to launch Extension Development Host
```

## Try It
- Open `samples/test.cm` in the Extension Host.
- Check the Problems panel and use Quick Fix lightbulbs on:
  - String length declaration (`string name;` → `string[20] name;`).
  - For-loop header index declaration moved out.
  - `binarysem` and `semaphore` invalid init values.
  - Nested `cobegin` block.
  - `main()` not last.
- Run Format Document to apply indentation and spacing.

## Settings
- `baci.defaultStringLength`: default used by string Quick Fix.
- `baci.format.spaceAroundOperators`: insert spaces around operators.
- `baci.format.indentSize`: indent width in spaces.
