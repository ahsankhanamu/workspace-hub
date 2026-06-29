import * as path from 'path';
import type { WorkspaceEntry } from '../models/WorkspaceEntry.js';

/**
 * Paths that should not appear as duplicate bare folders or git-folder workspaces
 * because a .code-workspace file already represents them.
 */
export function buildConsumedFolderPaths(entries: WorkspaceEntry[]): Set<string> {
  const consumed = new Set<string>();

  for (const entry of entries) {
    if (!entry.isWorkspaceFile || !entry.folders?.length) {
      continue;
    }

    for (const folderPath of entry.folders) {
      consumed.add(path.normalize(folderPath));
    }

    const workspaceParentDir = path.dirname(entry.filePath);
    const impliedContainerDir = path.normalize(path.join(workspaceParentDir, entry.name));
    const allUnderContainer = entry.folders.every(folderPath => {
      const normalized = path.normalize(folderPath);
      return normalized === impliedContainerDir
        || normalized.startsWith(impliedContainerDir + path.sep);
    });

    if (allUnderContainer) {
      consumed.add(impliedContainerDir);
    }
  }

  return consumed;
}

/**
 * Normalize a file path for consistent comparison.
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath);
}

/**
 * Get a display-friendly path (use ~ for home directory on Unix).
 */
export function displayPath(filePath: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  if (home && filePath.startsWith(home)) {
    return '~' + filePath.slice(home.length);
  }
  return filePath;
}

/**
 * Build a folder tree structure from workspace entries, condensing single-child folders.
 * Returns a map of parentPath -> children names for the tree.
 */
export function condensePathSegments(segments: string[]): string[] {
  if (segments.length <= 1) {
    return segments;
  }

  const condensed: string[] = [];
  let i = 0;
  while (i < segments.length) {
    let combined = segments[i];
    // This condensing is done at the tree provider level by checking
    // if a folder has exactly one child folder
    condensed.push(combined);
    i++;
  }
  return condensed;
}

/**
 * Extract workspace name from a file path.
 */
export function workspaceNameFromPath(filePath: string): string {
  const ext = path.extname(filePath);
  if (ext === '.code-workspace') {
    return path.basename(filePath, ext);
  }
  return path.basename(filePath);
}
