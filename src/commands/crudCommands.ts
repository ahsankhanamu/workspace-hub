import * as vscode from 'vscode';
import type { WorkspaceCrudService } from '../services/WorkspaceCrudService.js';
import type { InputFlowManager } from '../ui/InputFlowManager.js';
import { WorkspaceTreeItem, BareFolderTreeItem, WorkspaceFolderTreeItem } from '../models/TreeItems.js';

export function createCrudCommands(
  crudService: WorkspaceCrudService,
  inputFlowManager: InputFlowManager,
) {
  return {
    create: async () => {
      const result = await inputFlowManager.showCreateWorkspaceFlow();
      if (!result) { return; }

      try {
        const filePath = await crudService.createWorkspace(result.name, result.location, result.folders);
        const action = await vscode.window.showInformationMessage(
          `Created workspace "${result.name}"`,
          'Open',
          'Open in New Window',
        );

        if (action === 'Open' || action === 'Open in New Window') {
          const uri = vscode.Uri.file(filePath);
          await vscode.commands.executeCommand('vscode.openFolder', uri, {
            forceNewWindow: action === 'Open in New Window',
          });
        }
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to create workspace: ${(err as Error).message}`);
      }
    },

    delete: async (item?: WorkspaceTreeItem) => {
      if (!item?.workspace) { return; }
      if (!item.workspace.isWorkspaceFile) {
        vscode.window.showWarningMessage('Cannot delete a git folder workspace. Only .code-workspace files can be deleted.');
        return;
      }

      try {
        await crudService.deleteWorkspace(item.workspace.filePath);
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to delete workspace: ${(err as Error).message}`);
      }
    },

    rename: async (item?: WorkspaceTreeItem) => {
      if (!item?.workspace) { return; }
      if (!item.workspace.isWorkspaceFile) {
        vscode.window.showWarningMessage('Cannot rename a git folder workspace.');
        return;
      }

      const newName = await vscode.window.showInputBox({
        prompt: 'Enter new workspace name',
        value: item.workspace.name,
        validateInput: (value) => {
          if (!value.trim()) { return 'Name is required'; }
          if (/[<>:"/\\|?*]/.test(value)) { return 'Name contains invalid characters'; }
          return undefined;
        },
      });

      if (newName && newName !== item.workspace.name) {
        try {
          await crudService.renameWorkspace(item.workspace.filePath, newName.trim());
          vscode.window.showInformationMessage(`Renamed workspace to "${newName.trim()}"`);
        } catch (err) {
          vscode.window.showErrorMessage(`Failed to rename workspace: ${(err as Error).message}`);
        }
      }
    },

    createWorkspaceFile: async (item?: BareFolderTreeItem | WorkspaceTreeItem) => {
      let folderPath: string | undefined;
      let folderName: string | undefined;

      if (item instanceof BareFolderTreeItem) {
        folderPath = item.folderPath;
        folderName = item.folderName;
      } else if (item instanceof WorkspaceTreeItem && !item.workspace.isWorkspaceFile) {
        folderPath = item.workspace.filePath;
        folderName = item.workspace.name;
      }

      if (!folderPath || !folderName) { return; }

      try {
        const filePath = await crudService.createWorkspaceFileForFolder(folderPath);
        const action = await vscode.window.showInformationMessage(
          `Created workspace file for "${folderName}"`,
          'Open',
          'Open in New Window',
        );

        if (action === 'Open' || action === 'Open in New Window') {
          const uri = vscode.Uri.file(filePath);
          await vscode.commands.executeCommand('vscode.openFolder', uri, {
            forceNewWindow: action === 'Open in New Window',
          });
        }
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to create workspace file: ${(err as Error).message}`);
      }
    },

    duplicate: async (item?: WorkspaceTreeItem) => {
      if (!item?.workspace) { return; }
      if (!item.workspace.isWorkspaceFile) {
        vscode.window.showWarningMessage('Cannot duplicate a git folder workspace.');
        return;
      }

      try {
        const newPath = await crudService.duplicateWorkspace(item.workspace.filePath);
        vscode.window.showInformationMessage(`Duplicated workspace: ${newPath}`);
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to duplicate workspace: ${(err as Error).message}`);
      }
    },

    addFolder: async (item?: WorkspaceTreeItem) => {
      if (!item?.workspace || !item.workspace.isWorkspaceFile) { return; }
      const folderUris = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: true,
        openLabel: 'Add Folder',
        title: 'Choose folders to add to the workspace',
      });

      if (folderUris && folderUris.length > 0) {
        try {
          for (const uri of folderUris) {
            await crudService.addFolderToWorkspace(item.workspace.filePath, uri.fsPath);
          }
          vscode.window.showInformationMessage(`Added folders to workspace.`);
        } catch (err) {
          vscode.window.showErrorMessage(`Failed to add folder: ${(err as Error).message}`);
        }
      }
    },

    removeFolder: async (item?: WorkspaceFolderTreeItem) => {
      if (!item?.workspaceFilePath || !item.folderPath) { return; }
      
      try {
        await crudService.removeFolderFromWorkspace(item.workspaceFilePath, item.folderPath);
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to remove folder: ${(err as Error).message}`);
      }
    },
  };
}
