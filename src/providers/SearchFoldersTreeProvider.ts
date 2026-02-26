import * as vscode from 'vscode';
import { SearchFolderTreeItem } from '../models/TreeItems.js';
import { getSearchFolders } from '../utils/configUtils.js';

export class SearchFoldersTreeProvider implements vscode.TreeDataProvider<SearchFolderTreeItem>, vscode.Disposable {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<SearchFolderTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SearchFolderTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): SearchFolderTreeItem[] {
    const folders = getSearchFolders();
    return folders.map(folder => new SearchFolderTreeItem(folder));
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
