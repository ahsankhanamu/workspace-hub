import * as vscode from 'vscode';

export class InputFlowManager {
  /**
   * Multi-step input for creating a new workspace.
   * Returns { name, location, folders } or undefined if cancelled.
   */
  async showCreateWorkspaceFlow(): Promise<{ name: string; location: string; folders: string[] } | undefined> {
    // Step 1: Choose creation method
    const method = await vscode.window.showQuickPick(
      [
        { label: '$(new-file) Blank Workspace', description: 'Create an empty workspace file', value: 'blank' },
        { label: '$(folder-opened) From Existing Folders', description: 'Create a workspace from folders', value: 'folders' },
      ],
      { placeHolder: 'How would you like to create the workspace?' },
    );

    if (!method) {
      return undefined;
    }

    // Step 2: Workspace name
    const name = await vscode.window.showInputBox({
      prompt: 'Enter workspace name',
      placeHolder: 'my-workspace',
      validateInput: (value) => {
        if (!value.trim()) {
          return 'Name is required';
        }
        if (/[<>:"/\\|?*]/.test(value)) {
          return 'Name contains invalid characters';
        }
        return undefined;
      },
    });

    if (!name) {
      return undefined;
    }

    // Step 3: Location
    const locationUri = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select Location',
      title: 'Choose where to save the workspace file',
    });

    if (!locationUri || locationUri.length === 0) {
      return undefined;
    }

    const location = locationUri[0].fsPath;
    let folders: string[] = [];

    // Step 4: Select folders (if from existing)
    if ((method as { value: string }).value === 'folders') {
      const folderUris = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: true,
        openLabel: 'Select Folders',
        title: 'Choose folders to include in the workspace',
      });

      if (folderUris && folderUris.length > 0) {
        folders = folderUris.map(u => u.fsPath);
      }
    }

    return { name: name.trim(), location, folders };
  }
}
