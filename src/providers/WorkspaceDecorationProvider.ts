import * as vscode from 'vscode';
import type { WorkspaceStateService } from '../services/WorkspaceStateService.js';

export class WorkspaceDecorationProvider implements vscode.FileDecorationProvider {
  private readonly _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  public readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

  constructor(private readonly stateService: WorkspaceStateService) {}

  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    const filePath = uri.fsPath;

    if (this.stateService.isPinned(filePath)) {
      return {
        badge: '📌',
        tooltip: 'Pinned workspace',
      };
    }

    return undefined;
  }

  refresh(): void {
    this._onDidChangeFileDecorations.fire(undefined);
  }

  dispose(): void {
    this._onDidChangeFileDecorations.dispose();
  }
}
