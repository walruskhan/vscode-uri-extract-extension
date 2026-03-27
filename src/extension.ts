import * as vscode from 'vscode';
import { uriAtCharacter, buildMarkdownContent } from './uriUtils';

class UriHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const lineText = document.lineAt(position.line).text;
    const match = uriAtCharacter(lineText, position.character);

    if (!match) {
      return undefined;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(match.raw);
    } catch {
      return undefined;
    }

    const hoverRange = new vscode.Range(
      new vscode.Position(position.line, match.start),
      new vscode.Position(position.line, match.end)
    );

    const md = new vscode.MarkdownString(buildMarkdownContent(parsedUrl), true);
    md.supportHtml = false;

    return new vscode.Hover(md, hoverRange);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.languages.registerHoverProvider('*', new UriHoverProvider());
  context.subscriptions.push(disposable);
}

export function deactivate(): void {}
