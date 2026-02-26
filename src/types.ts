import type * as vscode from 'vscode';

export type ViewMode = 'tree' | 'list';
export type SortField = 'name' | 'lastModified' | 'lastOpened' | 'frequency';
export type SortDirection = 'asc' | 'desc';

export interface WorkspaceData {
  /** Absolute path to .code-workspace file, or folder path for git-based workspaces */
  filePath: string;
  /** Display name (derived from filename or folder name) */
  name: string;
  /** Whether this is a .code-workspace file (vs a git folder) */
  isWorkspaceFile: boolean;
  /** Last modified timestamp */
  lastModified: number;
  /** Folders contained in the workspace (parsed from .code-workspace) */
  folders?: string[];
}

export interface GroupData {
  id: string;
  name: string;
  color?: string;
  workspacePaths: string[];
}

export interface RecentEntry {
  filePath: string;
  timestamp: number;
}

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface WorkspaceHubEvents {
  onDidChangeWorkspaces: vscode.Event<void>;
  onDidChangeState: vscode.Event<void>;
}
