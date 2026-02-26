import * as vscode from 'vscode';
import { BaseTreeProvider } from './BaseTreeProvider.js';
import type { WorkspaceDiscoveryService } from '../services/WorkspaceDiscoveryService.js';
import type { WorkspaceStateService } from '../services/WorkspaceStateService.js';
import { WorkspaceTreeItem } from '../models/TreeItems.js';

export class FavoritesTreeProvider extends BaseTreeProvider<WorkspaceTreeItem> {
  constructor(
    private readonly discoveryService: WorkspaceDiscoveryService,
    stateService: WorkspaceStateService,
  ) {
    super(stateService);
  }

  getTreeItem(element: WorkspaceTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<WorkspaceTreeItem[]> {
    const favorites = this.stateService.getFavorites();
    if (favorites.length === 0) {
      return [];
    }

    const allWorkspaces = await this.discoveryService.getWorkspaces();
    const items: WorkspaceTreeItem[] = [];

    for (const favPath of favorites) {
      const entry = allWorkspaces.find(w => w.filePath === favPath);
      if (entry) {
        items.push(this.createWorkspaceTreeItem(entry));
      }
    }

    return items;
  }
}
