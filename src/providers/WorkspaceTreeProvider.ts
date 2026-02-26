import * as vscode from 'vscode';
import * as path from 'path';
import { BaseTreeProvider } from './BaseTreeProvider.js';
import type { WorkspaceDiscoveryService } from '../services/WorkspaceDiscoveryService.js';
import type { WorkspaceStateService } from '../services/WorkspaceStateService.js';
import type { SortService } from '../services/SortService.js';
import type { WorkspaceEntry } from '../models/WorkspaceEntry.js';
import { WorkspaceTreeItem, FolderTreeItem } from '../models/TreeItems.js';
import { getViewMode, getSortField, getSortDirection, getCondenseFolders, getSearchFolders } from '../utils/configUtils.js';
import type { ViewMode } from '../types.js';

type AllTreeItem = WorkspaceTreeItem | FolderTreeItem;

interface FolderNode {
  name: string;
  fullPath: string;
  children: Map<string, FolderNode>;
  workspaces: WorkspaceEntry[];
}

export class WorkspaceTreeProvider extends BaseTreeProvider<AllTreeItem> {
  private viewMode: ViewMode;
  private folderTree: Map<string, FolderNode> = new Map();
  private cachedEntries: WorkspaceEntry[] = [];

  constructor(
    private readonly discoveryService: WorkspaceDiscoveryService,
    stateService: WorkspaceStateService,
    private readonly sortService: SortService,
  ) {
    super(stateService);
    this.viewMode = getViewMode();
  }

  getViewMode(): ViewMode {
    return this.viewMode;
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.refresh();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'tree' ? 'list' : 'tree';
    this.refresh();
  }

  getTreeItem(element: AllTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: AllTreeItem): Promise<AllTreeItem[]> {
    if (!element) {
      return this.getRootChildren();
    }

    if (element instanceof FolderTreeItem) {
      return this.getFolderChildren(element.folderPath);
    }

    return [];
  }

  private async getRootChildren(): Promise<AllTreeItem[]> {
    const entries = await this.discoveryService.getWorkspaces();
    const sortField = getSortField();
    const sortDirection = getSortDirection();
    this.cachedEntries = this.sortService.sort(entries, sortField, sortDirection);

    if (this.viewMode === 'list') {
      return this.cachedEntries.map(e => this.createWorkspaceTreeItem(e));
    }

    // Tree mode: build folder hierarchy
    return this.buildTreeView();
  }

  private buildTreeView(): AllTreeItem[] {
    const searchFolders = getSearchFolders();
    const condense = getCondenseFolders();

    // Build folder tree from workspace entries
    this.folderTree.clear();

    // Group entries by their search folder root
    for (const rootFolder of searchFolders) {
      const resolved = rootFolder.startsWith('~')
        ? rootFolder.replace('~', process.env.HOME || process.env.USERPROFILE || '')
        : rootFolder;

      const rootNode: FolderNode = {
        name: path.basename(resolved),
        fullPath: resolved,
        children: new Map(),
        workspaces: [],
      };

      for (const entry of this.cachedEntries) {
        if (entry.filePath.startsWith(resolved) || entry.directory.startsWith(resolved)) {
          const segments = entry.getRelativeSegments(resolved);
          this.insertIntoTree(rootNode, segments, entry);
        }
      }

      this.folderTree.set(resolved, rootNode);
    }

    // Convert to tree items
    const items: AllTreeItem[] = [];

    if (this.folderTree.size === 1) {
      // Single root — show its children directly
      const root = [...this.folderTree.values()][0];
      items.push(...this.folderNodeToItems(root, condense));
    } else {
      // Multiple roots — show each root folder
      for (const [, rootNode] of this.folderTree) {
        if (rootNode.children.size > 0 || rootNode.workspaces.length > 0) {
          items.push(new FolderTreeItem(
            rootNode.name,
            rootNode.fullPath,
            vscode.TreeItemCollapsibleState.Expanded,
          ));
        }
      }
    }

    return items;
  }

  private insertIntoTree(node: FolderNode, segments: string[], entry: WorkspaceEntry): void {
    if (segments.length === 0) {
      node.workspaces.push(entry);
      return;
    }

    const [first, ...rest] = segments;
    let child = node.children.get(first);
    if (!child) {
      child = {
        name: first,
        fullPath: path.join(node.fullPath, first),
        children: new Map(),
        workspaces: [],
      };
      node.children.set(first, child);
    }
    this.insertIntoTree(child, rest, entry);
  }

  private folderNodeToItems(node: FolderNode, condense: boolean): AllTreeItem[] {
    const items: AllTreeItem[] = [];

    // Add child folders
    for (const [, childNode] of node.children) {
      // Condense: if a folder has exactly one child folder and no workspaces, merge them
      if (condense) {
        const condensedNode = this.condenseNode(childNode);
        if (condensedNode.children.size > 0 || condensedNode.workspaces.length > 0) {
          items.push(new FolderTreeItem(
            condensedNode.name,
            condensedNode.fullPath,
            vscode.TreeItemCollapsibleState.Expanded,
          ));
        }
      } else {
        if (childNode.children.size > 0 || childNode.workspaces.length > 0) {
          items.push(new FolderTreeItem(
            childNode.name,
            childNode.fullPath,
            vscode.TreeItemCollapsibleState.Expanded,
          ));
        }
      }
    }

    // Add workspaces at this level
    for (const entry of node.workspaces) {
      items.push(this.createWorkspaceTreeItem(entry));
    }

    return items;
  }

  private condenseNode(node: FolderNode): FolderNode {
    if (node.children.size === 1 && node.workspaces.length === 0) {
      const [childName, childNode] = [...node.children.entries()][0];
      const condensed = this.condenseNode(childNode);
      return {
        name: `${node.name}/${condensed.name}`,
        fullPath: condensed.fullPath,
        children: condensed.children,
        workspaces: condensed.workspaces,
      };
    }
    return node;
  }

  private getFolderChildren(folderPath: string): AllTreeItem[] {
    const condense = getCondenseFolders();
    const node = this.findNode(folderPath);
    if (!node) {
      return [];
    }
    return this.folderNodeToItems(node, condense);
  }

  private findNode(targetPath: string): FolderNode | undefined {
    for (const [, rootNode] of this.folderTree) {
      const found = this.findNodeRecursive(rootNode, targetPath);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  private findNodeRecursive(node: FolderNode, targetPath: string): FolderNode | undefined {
    if (node.fullPath === targetPath) {
      return node;
    }
    for (const [, child] of node.children) {
      const found = this.findNodeRecursive(child, targetPath);
      if (found) {
        return found;
      }
    }
    // Also check condensed paths
    if (node.children.size === 1 && node.workspaces.length === 0) {
      const condensed = this.condenseNode(node);
      if (condensed.fullPath === targetPath) {
        return condensed;
      }
    }
    return undefined;
  }

  getAllEntries(): WorkspaceEntry[] {
    return this.cachedEntries;
  }
}
