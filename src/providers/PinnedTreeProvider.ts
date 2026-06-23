import * as vscode from 'vscode';
import { BaseTreeProvider } from './BaseTreeProvider.js';
import type { WorkspaceDiscoveryService } from '../services/WorkspaceDiscoveryService.js';
import type { WorkspaceStateService } from '../services/WorkspaceStateService.js';
import { WorkspaceTreeItem, WorkspaceFolderTreeItem } from '../models/TreeItems.js';
import { WorkspaceEntry } from '../models/WorkspaceEntry.js';

export class PinnedTreeProvider extends BaseTreeProvider<vscode.TreeItem> {
  constructor(
    private readonly discoveryService: WorkspaceDiscoveryService,
    stateService: WorkspaceStateService,
  ) {
    super(stateService);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (element instanceof WorkspaceTreeItem) {
      return this.getWorkspaceChildren(element);
    }

    const pinned = this.stateService.getPinned();
    if (pinned.length === 0) {
      return [];
    }

    const allWorkspaces = await this.discoveryService.getWorkspaces();
    const items: WorkspaceTreeItem[] = [];

    for (const p of pinned) {
      let entry = allWorkspaces.find(w => w.filePath === p);
      if (!entry) {
        entry = WorkspaceEntry.fromGitFolder(p, 0);
      }
      items.push(this.createWorkspaceTreeItem(entry));
    }

    return items;
  }
}
