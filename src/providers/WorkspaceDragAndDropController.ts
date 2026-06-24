import * as vscode from 'vscode';
import { WorkspaceTreeItem, BareFolderTreeItem, FolderTreeItem, SearchFolderTreeItem, WorkspaceFolderTreeItem } from '../models/TreeItems.js';
import type { WorkspaceCrudService } from '../services/WorkspaceCrudService.js';

export class WorkspaceDragAndDropController implements vscode.TreeDragAndDropController<vscode.TreeItem> {
  dropMimeTypes: string[] = ['text/uri-list', 'application/vnd.workspacehub.folder', 'files'];
  dragMimeTypes: string[] = ['text/uri-list', 'application/vnd.workspacehub.folder'];

  constructor(private readonly crudService: WorkspaceCrudService) {}

  public async handleDrag(
    source: vscode.TreeItem[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    const uris: string[] = [];
    const customPayloads: Array<{ workspaceFilePath: string, folderPath: string }> = [];

    for (const item of source) {
      if (item.resourceUri) {
        uris.push(item.resourceUri.toString());
      } else if (item instanceof WorkspaceTreeItem) {
        uris.push(vscode.Uri.file(item.workspace.filePath).toString());
      } else if (item instanceof BareFolderTreeItem || item instanceof FolderTreeItem || item instanceof SearchFolderTreeItem) {
        uris.push(vscode.Uri.file(item.folderPath).toString());
      }

      // Check if dragging a folder FROM a workspace
      if (item instanceof WorkspaceFolderTreeItem) {
        customPayloads.push({
          workspaceFilePath: item.workspaceFilePath,
          folderPath: item.folderPath
        });
      }
    }
    
    if (uris.length > 0) {
      dataTransfer.set('text/uri-list', new vscode.DataTransferItem(uris.join('\r\n')));
    }

    if (customPayloads.length > 0) {
      dataTransfer.set('application/vnd.workspacehub.folder', new vscode.DataTransferItem(JSON.stringify(customPayloads)));
    }
  }
  
  public async handleDrop(
    target: vscode.TreeItem | undefined,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    
    // First, handle dragging OUT of an existing workspace
    const customData = dataTransfer.get('application/vnd.workspacehub.folder');
    if (customData) {
      try {
        const dataStr = await customData.asString();
        if (dataStr) {
          const payloads = JSON.parse(dataStr) as Array<{ workspaceFilePath: string, folderPath: string }>;
          for (const payload of payloads) {
            // If dropped outside its parent workspace (target is undefined or a different workspace)
            const droppedOutsideParent = !target || (target instanceof WorkspaceTreeItem && target.workspace.filePath !== payload.workspaceFilePath);
            
            if (droppedOutsideParent) {
              // Remove from original workspace
              await this.crudService.removeFolderFromWorkspace(payload.workspaceFilePath, payload.folderPath);
            }
          }
        }
      } catch (err) {
        console.error('Failed to parse drag and drop payload', err);
      }
      // DO NOT return here, we need to let the next block add it to the new workspace!
    }

    // Next, handle dropping regular folders (OS or otherwise) INTO a workspace
    let dropWorkspacePath: string | undefined;
    if (target instanceof WorkspaceTreeItem && target.workspace.isWorkspaceFile) {
      dropWorkspacePath = target.workspace.filePath;
    } else if (target instanceof WorkspaceFolderTreeItem) {
      dropWorkspacePath = target.workspaceFilePath;
    }

    if (dropWorkspacePath) {
      let addedCount = 0;
      
      // 1. Process files dropped directly from the OS
      for (const [mime, item] of dataTransfer) {
        if (mime === 'text/uri-list') continue; // We'll handle this below
        const file = item.asFile();
        if (file && file.uri && file.uri.scheme === 'file') {
          await this.crudService.addFolderToWorkspace(dropWorkspacePath, file.uri.fsPath);
          addedCount++;
        }
      }

      // 2. Process text/uri-list (files dragged from VS Code explorer or internal elements)
      const uriList = dataTransfer.get('text/uri-list');
      if (uriList) {
        const rawUris = await uriList.asString();
        const uris = rawUris.split(/\r?\n/);
        
        for (const uriStr of uris) {
          if (!uriStr.trim() || uriStr.startsWith('#')) continue;
          try {
            const uri = vscode.Uri.parse(uriStr.trim());
            // Only add if it is a local file system path
            if (uri.scheme === 'file') {
              // Avoid adding the same file twice if it was already processed above
              await this.crudService.addFolderToWorkspace(dropWorkspacePath, uri.fsPath);
              addedCount++;
            } else {
              vscode.window.showWarningMessage(`Ignored non-file URI: ${uriStr}`);
            }
          } catch (e) {
            vscode.window.showErrorMessage(`Failed to parse URI: ${uriStr}`);
          }
        }
      }

      if (addedCount > 0) {
        vscode.window.showInformationMessage(`Successfully added folder(s) to the workspace.`);
      } else {
        vscode.window.showWarningMessage(`No valid local folders were found in the drop payload.`);
      }
    }
  }
}
