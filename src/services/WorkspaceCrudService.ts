import * as vscode from 'vscode';
import * as path from 'path';
import { readJsonFile, writeJsonFile, deleteFile, copyFile, renameFile, fileExists, rewriteWorkspaceFolderPaths } from '../utils/fsUtils.js';
import { getConfirmDelete } from '../utils/configUtils.js';
import type { WorkspaceDiscoveryService } from './WorkspaceDiscoveryService.js';
import type { WorkspaceStateService } from './WorkspaceStateService.js';

export class WorkspaceCrudService {
  constructor(
    private readonly discoveryService: WorkspaceDiscoveryService,
    private readonly stateService?: WorkspaceStateService,
  ) {}

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

  async moveWorkspace(workspacePath: string, destinationDir: string): Promise<string> {
    const oldDir = path.dirname(workspacePath);
    const normalizedDestination = path.resolve(destinationDir);

    if (oldDir === normalizedDestination) {
      return workspacePath;
    }

    const fileName = path.basename(workspacePath);
    const newPath = path.join(normalizedDestination, fileName);

    if (await fileExists(newPath)) {
      throw new Error(`A workspace file already exists at: ${newPath}`);
    }

    const data = await readJsonFile<{ folders?: Array<{ path: string }>, [key: string]: unknown }>(workspacePath);
    if (!data) {
      throw new Error(`Could not read workspace file: ${workspacePath}`);
    }

    if (data.folders) {
      data.folders = rewriteWorkspaceFolderPaths(data.folders, oldDir, normalizedDestination);
    }

    await writeJsonFile(newPath, data);
    await deleteFile(workspacePath);
    await this.stateService?.remapWorkspacePath(workspacePath, newPath);
    await this.discoveryService.refresh();
    return newPath;
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

  async createWorkspaceFileForFolder(folderPath: string): Promise<string> {
    const folderName = path.basename(folderPath);
    const filePath = path.join(folderPath, `${folderName}.code-workspace`);

    if (await fileExists(filePath)) {
      throw new Error(`Workspace file already exists: ${filePath}`);
    }

    const content = {
      folders: [{ path: '.' }],
      settings: {},
    };

    await writeJsonFile(filePath, content);
    await this.discoveryService.refresh();
    return filePath;
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

  async addFolderToWorkspace(workspacePath: string, folderPathToAdd: string): Promise<void> {
    const data = await readJsonFile<{ folders?: Array<{ path: string }>, [key: string]: unknown }>(workspacePath);
    if (!data) {
      throw new Error(`Could not read workspace file: ${workspacePath}`);
    }

    if (!data.folders) {
      data.folders = [];
    }

    const relPath = path.isAbsolute(folderPathToAdd) 
      ? path.relative(path.dirname(workspacePath), folderPathToAdd) || '.'
      : folderPathToAdd;

    // Check if it already exists
    if (data.folders.some(f => f.path === relPath || f.path === folderPathToAdd)) {
      vscode.window.showInformationMessage('Folder is already in the workspace.');
      return;
    }

    data.folders.push({ path: relPath });
    await writeJsonFile(workspacePath, data);
    await this.discoveryService.refresh();
  }

  async removeFolderFromWorkspace(workspacePath: string, folderPathToRemove: string): Promise<void> {
    const data = await readJsonFile<{ folders?: Array<{ path: string }>, [key: string]: unknown }>(workspacePath);
    if (!data || !data.folders) {
      throw new Error(`Could not read workspace file or it has no folders: ${workspacePath}`);
    }

    const relPath = path.isAbsolute(folderPathToRemove) 
      ? path.relative(path.dirname(workspacePath), folderPathToRemove) || '.'
      : folderPathToRemove;

    const initialLength = data.folders.length;
    data.folders = data.folders.filter(f => f.path !== relPath && f.path !== folderPathToRemove && path.resolve(path.dirname(workspacePath), f.path) !== folderPathToRemove);

    if (data.folders.length !== initialLength) {
      await writeJsonFile(workspacePath, data);
      await this.discoveryService.refresh();
    }
  }

  dispose(): void {
    // Nothing to clean up
  }
}
