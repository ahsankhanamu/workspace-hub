import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { BaseTreeProvider } from './BaseTreeProvider.js';
import type { WorkspaceDiscoveryService } from '../services/WorkspaceDiscoveryService.js';
import type { WorkspaceStateService } from '../services/WorkspaceStateService.js';
import type { SortService } from '../services/SortService.js';
import type { WorkspaceEntry } from '../models/WorkspaceEntry.js';
import { WorkspaceTreeItem, FolderTreeItem, BareFolderTreeItem, WorkspaceFolderTreeItem } from '../models/TreeItems.js';
import { getViewMode, getSortField, getSortDirection, getCondenseFolders, getSearchFolders } from '../utils/configUtils.js';
import type { ViewMode } from '../types.js';

type AllTreeItem = WorkspaceTreeItem | FolderTreeItem | BareFolderTreeItem | WorkspaceFolderTreeItem;

interface FolderNode {
  name: string;
  fullPath: string;
  children: Map<string, FolderNode>;
  workspaces: WorkspaceEntry[];
}

export class WorkspaceTreeProvider extends BaseTreeProvider<AllTreeItem> {
  private viewMode: ViewMode;
  private folderTree = new Map<string, FolderNode>();
  private consumedFolderPaths = new Set<string>();
  private cachedEntries: WorkspaceEntry[] = [];
  private _filterText = '';

  constructor(
    private readonly discoveryService: WorkspaceDiscoveryService,
    stateService: WorkspaceStateService,
    private readonly sortService: SortService,
  ) {
    super(stateService);
    this.viewMode = getViewMode();
  }

  protected override createWorkspaceTreeItem(entry: WorkspaceEntry, isGrouped = false): WorkspaceTreeItem {
    return new WorkspaceTreeItem(
      entry,
      this.stateService.isFavorite(entry.filePath),
      this.stateService.isPinned(entry.filePath),
      isGrouped,
    );
  }

  get filterText(): string {
    return this._filterText;
  }

  setFilter(text: string): void {
    this._filterText = text;
    void vscode.commands.executeCommand('setContext', 'workspaceHub.filterActive', text.length > 0);
    this.refresh();
  }

  clearFilter(): void {
    this._filterText = '';
    void vscode.commands.executeCommand('setContext', 'workspaceHub.filterActive', false);
    this.refresh();
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

    if (element instanceof WorkspaceTreeItem) {
      return this.getWorkspaceChildren(element) as AllTreeItem[];
    }

    return [];
  }

  private matchesFilter(entry: WorkspaceEntry): boolean {
    if (!this._filterText) {
      return true;
    }
    const q = this._filterText.toLowerCase();
    return entry.name.toLowerCase().includes(q)
      || entry.filePath.toLowerCase().includes(q)
      || entry.directory.toLowerCase().includes(q);
  }

  private async getRootChildren(): Promise<AllTreeItem[]> {
    const entries = await this.discoveryService.getWorkspaces();
    const sortField = getSortField();
    const sortDirection = getSortDirection();
    this.cachedEntries = this.sortService.sort(entries, sortField, sortDirection);

    if (this.viewMode === 'list') {
      return this.cachedEntries.filter(e => this.matchesFilter(e)).map(e => this.createWorkspaceTreeItem(e));
    }

    return await this.buildTreeView();
  }

  private async buildTreeView(): Promise<AllTreeItem[]> {
    const searchFolders = getSearchFolders();
    const condense = getCondenseFolders();

    this.folderTree.clear();
    this.consumedFolderPaths.clear();

    for (const entry of this.cachedEntries) {
      if (entry.isWorkspaceFile && entry.folders) {
        for (const f of entry.folders) {
          this.consumedFolderPaths.add(f);
        }
      }
    }

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
        if (!this.matchesFilter(entry)) {
          continue;
        }
        if (entry.filePath.startsWith(resolved) || entry.directory.startsWith(resolved)) {
          const segments = entry.getRelativeSegments(resolved);
          this.insertIntoTree(rootNode, segments, entry);
        }
      }

      this.folderTree.set(resolved, rootNode);
    }

    const items: AllTreeItem[] = [];

    if (this.folderTree.size === 1) {
      const root = [...this.folderTree.values()][0];
      items.push(...(await this.folderNodeToItems(root, condense)));
    } else {
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

  private async folderNodeToItems(node: FolderNode, condense: boolean): Promise<AllTreeItem[]> {
    const items: AllTreeItem[] = [];

    const onDiskDirs = new Set<string>();
    const childFolderPaths = new Set<string>();

    // Add .code-workspace files at the very top
    const codeWorkspaces = node.workspaces.filter(e => e.isWorkspaceFile);
    const folderWorkspaces = node.workspaces.filter(e => !e.isWorkspaceFile && !this.consumedFolderPaths.has(e.filePath));

    for (const entry of codeWorkspaces) {
      items.push(this.createWorkspaceTreeItem(entry));
    }

    const foldersToAppend: AllTreeItem[] = [];

    // Then folder workspaces
    for (const entry of folderWorkspaces) {
      foldersToAppend.push(this.createWorkspaceTreeItem(entry));
    }

    const folderItems: FolderTreeItem[] = [];
    for (const [, childNode] of node.children) {
      childFolderPaths.add(childNode.fullPath);
      if (condense) {
        const condensedNode = this.condenseNode(childNode);
        if (condensedNode.children.size > 0 || condensedNode.workspaces.length > 0) {
          folderItems.push(new FolderTreeItem(
            condensedNode.name,
            condensedNode.fullPath,
            vscode.TreeItemCollapsibleState.Expanded,
          ));
        }
      } else {
        if (childNode.children.size > 0 || childNode.workspaces.length > 0) {
          folderItems.push(new FolderTreeItem(
            childNode.name,
            childNode.fullPath,
            vscode.TreeItemCollapsibleState.Expanded,
          ));
        }
      }
    }
    
    foldersToAppend.push(...folderItems);

    // Scan for bare folders — subdirectories on disk that have no workspace entry
    await this.scanBareFolders(node, childFolderPaths, onDiskDirs, foldersToAppend);

    // Sort folders alphabetically
    foldersToAppend.sort((a, b) => {
      const getSortName = (item: AllTreeItem) => {
        if ('workspace' in item && item.workspace) return item.workspace.name;
        if ('folderName' in item) return (item as any).folderName;
        return (item.label as string) || '';
      };
      return getSortName(a).localeCompare(getSortName(b));
    });

    items.push(...foldersToAppend);

    return items;
  }

  private async scanBareFolders(
    node: FolderNode,
    childFolderPaths: Set<string>,
    onDiskDirs: Set<string>,
    items: AllTreeItem[],
  ): Promise<void> {
    try {
      const dirEntries = await fs.readdir(node.fullPath, { withFileTypes: true });
      for (const entry of dirEntries) {
        if (!entry.isDirectory()) {
          continue;
        }
        if (entry.name.startsWith('.')) {
          continue;
        }
        const fullPath = path.join(node.fullPath, entry.name);
        if (this.consumedFolderPaths.has(fullPath)) {
          continue;
        }
        if (!childFolderPaths.has(fullPath) && !node.workspaces.some(w => w.filePath === fullPath || w.directory === fullPath)) {
          items.push(new BareFolderTreeItem(entry.name, fullPath));
        }
      }
    } catch {
      // Ignore — directory might not exist or be inaccessible
    }
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

  private async getFolderChildren(folderPath: string): Promise<AllTreeItem[]> {
    const condense = getCondenseFolders();
    const node = this.findNode(folderPath);
    if (!node) {
      return [];
    }
    return await this.folderNodeToItems(node, condense);
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
