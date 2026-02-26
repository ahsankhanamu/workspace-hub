import * as vscode from 'vscode';
import { BaseTreeProvider } from './BaseTreeProvider.js';
import type { WorkspaceDiscoveryService } from '../services/WorkspaceDiscoveryService.js';
import type { WorkspaceStateService } from '../services/WorkspaceStateService.js';
import { WorkspaceTreeItem, GroupTreeItem } from '../models/TreeItems.js';

type GroupItem = GroupTreeItem | WorkspaceTreeItem;

export class GroupsTreeProvider extends BaseTreeProvider<GroupItem> {
  constructor(
    private readonly discoveryService: WorkspaceDiscoveryService,
    stateService: WorkspaceStateService,
  ) {
    super(stateService);
  }

  getTreeItem(element: GroupItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: GroupItem): Promise<GroupItem[]> {
    if (!element) {
      // Root: show groups
      const groups = this.stateService.getGroups();
      return groups.map(g => new GroupTreeItem(g));
    }

    if (element instanceof GroupTreeItem) {
      // Show workspaces in this group
      const allWorkspaces = await this.discoveryService.getWorkspaces();
      const items: WorkspaceTreeItem[] = [];

      for (const wsPath of element.group.workspacePaths) {
        const entry = allWorkspaces.find(w => w.filePath === wsPath);
        if (entry) {
          items.push(this.createWorkspaceTreeItem(entry, true));
        }
      }

      return items;
    }

    return [];
  }
}
