import * as vscode from 'vscode';
import type { WorkspaceEntry } from '../models/WorkspaceEntry.js';
import { WorkspaceTreeItem } from '../models/TreeItems.js';
import type { WorkspaceStateService } from '../services/WorkspaceStateService.js';

export function openWorkspace(
  stateService: WorkspaceStateService,
  itemOrEntry: WorkspaceTreeItem | WorkspaceEntry | undefined,
  newWindow = false,
): void {
  const entry = itemOrEntry instanceof WorkspaceTreeItem
    ? itemOrEntry.workspace
    : itemOrEntry;

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
