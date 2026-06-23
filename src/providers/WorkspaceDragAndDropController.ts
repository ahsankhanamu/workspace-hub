import * as vscode from 'vscode';
import { WorkspaceTreeItem, BareFolderTreeItem, FolderTreeItem, SearchFolderTreeItem } from '../models/TreeItems.js';

export class WorkspaceDragAndDropController implements vscode.TreeDragAndDropController<vscode.TreeItem> {
  dropMimeTypes: string[] = [];
  dragMimeTypes: string[] = ['text/uri-list'];

  public async handleDrag(
    source: vscode.TreeItem[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    const uris: string[] = [];
    for (const item of source) {
      if (item.resourceUri) {
        uris.push(item.resourceUri.toString());
      } else if (item instanceof WorkspaceTreeItem) {
        uris.push(vscode.Uri.file(item.workspace.filePath).toString());
      } else if (item instanceof BareFolderTreeItem || item instanceof FolderTreeItem || item instanceof SearchFolderTreeItem) {
        uris.push(vscode.Uri.file(item.folderPath).toString());
      }
    }
    
    if (uris.length > 0) {
      dataTransfer.set('text/uri-list', new vscode.DataTransferItem(uris.join('\r\n')));
    }
  }
  
  public async handleDrop(
    target: vscode.TreeItem | undefined,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    // Readonly drop
  }
}
