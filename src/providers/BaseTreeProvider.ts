import * as vscode from 'vscode';
import type { WorkspaceEntry } from '../models/WorkspaceEntry.js';
import type { WorkspaceStateService } from '../services/WorkspaceStateService.js';
import { WorkspaceTreeItem, WorkspaceFolderTreeItem } from '../models/TreeItems.js';
import * as path from 'path';

export abstract class BaseTreeProvider<T extends vscode.TreeItem> implements vscode.TreeDataProvider<T> {
  protected readonly _onDidChangeTreeData = new vscode.EventEmitter<T | undefined | void>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(protected readonly stateService: WorkspaceStateService) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  abstract getTreeItem(element: T): vscode.TreeItem;
  abstract getChildren(element?: T): Promise<T[]>;

  protected createWorkspaceTreeItem(
    entry: WorkspaceEntry,
    isGrouped = false,
  ): WorkspaceTreeItem {
    const isFavorite = this.stateService.isFavorite(entry.filePath);
    const isPinned = this.stateService.isPinned(entry.filePath);
    return new WorkspaceTreeItem(entry, isFavorite, isPinned, isGrouped);
  }

  protected getWorkspaceChildren(element: WorkspaceTreeItem): vscode.TreeItem[] {
    if (element.workspace.isWorkspaceFile && element.workspace.folders) {
      return element.workspace.folders.map(f => {
        let folderPath = f;
        if (!path.isAbsolute(f)) {
          folderPath = path.join(path.dirname(element.workspace.filePath), f);
        }
        return new WorkspaceFolderTreeItem(folderPath, element.workspace.filePath);
      });
    }
    return [];
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
