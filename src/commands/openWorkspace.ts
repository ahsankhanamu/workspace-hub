import * as vscode from 'vscode';
import { WorkspaceEntry } from '../models/WorkspaceEntry.js';
import { WorkspaceTreeItem, BareFolderTreeItem } from '../models/TreeItems.js';
import type { WorkspaceStateService } from '../services/WorkspaceStateService.js';

export function openWorkspace(
  stateService: WorkspaceStateService,
  itemOrEntry: WorkspaceTreeItem | WorkspaceEntry | BareFolderTreeItem | undefined,
  newWindow = false,
): void {
  let entry: WorkspaceEntry | undefined;
  
  if (itemOrEntry instanceof WorkspaceTreeItem) {
    entry = itemOrEntry.workspace;
  } else if (itemOrEntry instanceof BareFolderTreeItem) {
    // Treat the bare folder as a temporary workspace entry for opening
    entry = WorkspaceEntry.fromGitFolder(itemOrEntry.folderPath, 0);
  } else {
    entry = itemOrEntry;
  }

  if (!entry) {
    return;
  }

  const uri = vscode.Uri.file(entry.filePath);

  // Record in recents and increment frequency
  void stateService.addRecent(entry.filePath);
  void stateService.incrementOpenCount(entry.filePath);

  if (entry.isWorkspaceFile) {
    void vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: newWindow });
  } else {
    void vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: newWindow });
  }
}
