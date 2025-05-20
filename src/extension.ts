import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('excelToObject.pasteAsObject', async () => {
    const config = vscode.workspace.getConfiguration('excelToObject');
    const alwaysShowPicker = config.get<boolean>('alwaysShowFormatPicker', true);

    function cleanCell(value: string): string {
      return value.replaceAll(/\r/g, '').trim();
    }

    let format: string | undefined;
    let delimiter: string | undefined;

    const formats = [
      'Object (Row Keys)',
      'Object (Column Keys)',
      'Array of Arrays'
    ];

    const delimiters = [',', ';', '\t', '|', ' '];

    if (alwaysShowPicker) {
      format = await vscode.window.showQuickPick(formats, {
        placeHolder: 'Select output format'
      });

      if (!format) { return; } // cancelled

      await config.update('defaultFormat', format, vscode.ConfigurationTarget.Global);

      delimiter = await vscode.window.showQuickPick(delimiters, { placeHolder: 'Select delimiter' });
      if (!delimiter) { return; }
      await config.update('defaultDelimiter', delimiter, vscode.ConfigurationTarget.Global);
    } else {
      format = config.get<string>('defaultFormat', 'Object (Row Keys)');
      delimiter = config.get<string>('defaultDelimiter', '\t');
    }

    const clipboard = await vscode.env.clipboard.readText();
    const lines = clipboard.trim().split(/\r?\n/);
    const rows = lines.map(line => line.split(delimiter).map(cell => cleanCell(cell)));

    if (rows.length === 0) {
      vscode.window.showErrorMessage("Clipboard is empty or not valid tabular data.");
      return;
    }

    let result: any;

    if (format === 'Object (Row Keys)') {
      result = Object.fromEntries(rows.map(row => [row[0], row.slice(1)]));
    } else if (format === 'Object (Column Keys)') {
      const headers = rows[0].slice(1);
      const obj: Record<string, string[]> = {};
      for (let col = 1; col < rows[0].length; col++) {
        const key = rows[0][col];
        obj[key] = rows.slice(1).map(row => row[col]);
      }
      result = obj;
    } else if (format === 'Array of Arrays') {
      result = rows;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.edit(editBuilder => {
        const text = JSON.stringify(result, null, 2);
        editBuilder.insert(editor.selection.active, text);
      });
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
