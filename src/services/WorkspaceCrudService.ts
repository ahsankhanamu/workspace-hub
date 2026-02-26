import * as vscode from 'vscode';
import * as path from 'path';
import { writeJsonFile, deleteFile, copyFile, renameFile, fileExists } from '../utils/fsUtils.js';
import { getConfirmDelete } from '../utils/configUtils.js';
import type { WorkspaceDiscoveryService } from './WorkspaceDiscoveryService.js';

export class WorkspaceCrudService {
  constructor(private readonly discoveryService: WorkspaceDiscoveryService) {}

  async createWorkspace(name: string, location: string, folders: string[] = []): Promise<string> {
    const filePath = path.join(location, `${name}.code-workspace`);

    if (await fileExists(filePath)) {
      throw new Error(`Workspace file already exists: ${filePath}`);
    }

    const content = {
      folders: folders.length > 0
        ? folders.map(f => ({ path: f }))
        : [{ path: '.' }],
      settings: {},
    };

    await writeJsonFile(filePath, content);
    await this.discoveryService.refresh();
    return filePath;
  }

  async deleteWorkspace(filePath: string): Promise<boolean> {
    if (getConfirmDelete()) {
      const answer = await vscode.window.showWarningMessage(
        `Delete workspace file "${path.basename(filePath)}"?`,
        { modal: true },
        'Delete',
      );
      if (answer !== 'Delete') {
        return false;
      }
    }

    await deleteFile(filePath);
    await this.discoveryService.refresh();
    return true;
  }

  async renameWorkspace(filePath: string, newName: string): Promise<string> {
    const dir = path.dirname(filePath);
    const newPath = path.join(dir, `${newName}.code-workspace`);

    if (await fileExists(newPath)) {
      throw new Error(`A workspace named "${newName}" already exists in this location.`);
    }

    await renameFile(filePath, newPath);
    await this.discoveryService.refresh();
    return newPath;
  }

  async duplicateWorkspace(filePath: string): Promise<string> {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);

    let counter = 1;
    let newPath: string;
    do {
      newPath = path.join(dir, `${baseName} (${counter})${ext}`);
      counter++;
    } while (await fileExists(newPath));

    await copyFile(filePath, newPath);
    await this.discoveryService.refresh();
    return newPath;
  }

  dispose(): void {
    // Nothing to clean up
  }
}
