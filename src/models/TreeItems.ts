import * as vscode from 'vscode';
import type { WorkspaceEntry } from './WorkspaceEntry.js';
import type { GroupEntry } from './GroupEntry.js';

export class WorkspaceTreeItem extends vscode.TreeItem {
  constructor(
    public readonly workspace: WorkspaceEntry,
    public readonly isFavorite: boolean = false,
    public readonly isPinned: boolean = false,
    public readonly isGrouped: boolean = false,
  ) {
    super(workspace.name, vscode.TreeItemCollapsibleState.None);

    this.resourceUri = vscode.Uri.file(workspace.filePath);
    this.tooltip = this.buildTooltip();
    this.description = this.buildDescription();
    this.contextValue = this.buildContextValue();

    this.command = {
      command: 'workspaceHub.open',
      title: 'Open Workspace',
      arguments: [this],
    };

    // Icon
    if (isPinned) {
      this.iconPath = new vscode.ThemeIcon('pinned', new vscode.ThemeColor('charts.yellow'));
    } else if (isFavorite) {
      this.iconPath = new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.orange'));
    } else if (workspace.isWorkspaceFile) {
      this.iconPath = new vscode.ThemeIcon('root-folder');
    } else {
      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }

  private buildTooltip(): vscode.MarkdownString {
    const md = new vscode.MarkdownString('', true);
    md.supportThemeIcons = true;
    md.appendMarkdown(`**${this.workspace.name}**\n\n`);
    md.appendMarkdown(`$(folder) \`${this.workspace.filePath}\`\n\n`);

    if (this.workspace.isWorkspaceFile && this.workspace.folders?.length) {
      md.appendMarkdown(`**Folders:** ${this.workspace.folders.length}\n\n`);
      for (const f of this.workspace.folders.slice(0, 5)) {
        md.appendMarkdown(`- \`${f}\`\n`);
      }
      if (this.workspace.folders.length > 5) {
        md.appendMarkdown(`- *...and ${this.workspace.folders.length - 5} more*\n`);
      }
    }

    return md;
  }

  private buildDescription(): string {
    return this.workspace.directory;
  }

  private buildContextValue(): string {
    let ctx = 'workspace';
    if (this.isFavorite) { ctx += '.favorite'; }
    if (this.isPinned) { ctx += '.pinned'; }
    if (this.isGrouped) { ctx += '.grouped'; }
    return ctx;
  }
}

export class FolderTreeItem extends vscode.TreeItem {
  constructor(
    public readonly folderName: string,
    public readonly folderPath: string,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Expanded,
  ) {
    super(folderName, collapsibleState);
    this.contextValue = 'folder';
    this.iconPath = vscode.ThemeIcon.Folder;
    this.tooltip = folderPath;
  }
}

export class SearchFolderTreeItem extends vscode.TreeItem {
  constructor(
    public readonly folderPath: string,
  ) {
    const segments = folderPath.split('/');
    const label = segments[segments.length - 1] || folderPath;
    super(label, vscode.TreeItemCollapsibleState.None);

    this.contextValue = 'searchFolder';
    this.description = folderPath.replace(/^\/Users\/[^/]+/, '~');
    this.iconPath = new vscode.ThemeIcon('folder-library');
    this.tooltip = folderPath;
  }
}

export class GroupTreeItem extends vscode.TreeItem {
  constructor(public readonly group: GroupEntry) {
    super(group.name, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'group';
    this.description = `${group.workspacePaths.length} workspace${group.workspacePaths.length !== 1 ? 's' : ''}`;

    if (group.color) {
      this.iconPath = new vscode.ThemeIcon('folder', new vscode.ThemeColor(group.color));
    } else {
      this.iconPath = new vscode.ThemeIcon('folder-library');
    }
  }
}
