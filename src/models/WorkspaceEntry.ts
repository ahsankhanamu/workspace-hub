import * as path from 'path';
import type { WorkspaceData } from '../types.js';

export class WorkspaceEntry implements WorkspaceData {
  public readonly filePath: string;
  public readonly name: string;
  public readonly isWorkspaceFile: boolean;
  public readonly lastModified: number;
  public readonly folders: string[];

  constructor(data: WorkspaceData) {
    this.filePath = data.filePath;
    this.name = data.name;
    this.isWorkspaceFile = data.isWorkspaceFile;
    this.lastModified = data.lastModified;
    this.folders = data.folders ?? [];
  }

  get directory(): string {
    return path.dirname(this.filePath);
  }

  get fileName(): string {
    return path.basename(this.filePath);
  }

  get extension(): string {
    return path.extname(this.filePath);
  }

  /** Relative path segments from a root folder, for tree display */
  getRelativeSegments(rootFolder: string): string[] {
    const rel = path.relative(rootFolder, this.directory);
    if (rel === '' || rel === '.') {
      return [];
    }
    return rel.split(path.sep);
  }

  static fromWorkspaceFile(filePath: string, lastModified: number, folders?: string[]): WorkspaceEntry {
    const name = path.basename(filePath, '.code-workspace');
    return new WorkspaceEntry({
      filePath,
      name,
      isWorkspaceFile: true,
      lastModified,
      folders,
    });
  }

  static fromGitFolder(folderPath: string, lastModified: number): WorkspaceEntry {
    const name = path.basename(folderPath);
    return new WorkspaceEntry({
      filePath: folderPath,
      name,
      isWorkspaceFile: false,
      lastModified,
    });
  }
}
