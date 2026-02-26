import * as vscode from 'vscode';
import { CMD } from '../constants.js';
import { getShowStatusBar, getStatusBarAlignment, getStatusBarPriority } from '../utils/configUtils.js';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem | undefined;

  setup(): void {
    this.dispose();

    if (!getShowStatusBar()) {
      return;
    }

    const alignment = getStatusBarAlignment() === 'left'
      ? vscode.StatusBarAlignment.Left
      : vscode.StatusBarAlignment.Right;
    const priority = getStatusBarPriority();

    this.statusBarItem = vscode.window.createStatusBarItem(alignment, priority);
    this.statusBarItem.command = CMD.quickSwitch;
    this.update();
    this.statusBarItem.show();
  }

  update(): void {
    if (!this.statusBarItem) {
      return;
    }

    const workspaceName = vscode.workspace.name;
    if (workspaceName) {
      this.statusBarItem.text = `$(folder-active) ${workspaceName}`;
      this.statusBarItem.tooltip = `Current workspace: ${workspaceName}\nClick to switch workspace`;
    } else {
      this.statusBarItem.text = '$(folder) No Workspace';
      this.statusBarItem.tooltip = 'Click to open a workspace';
    }
  }

  dispose(): void {
    this.statusBarItem?.dispose();
    this.statusBarItem = undefined;
  }
}
