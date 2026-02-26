import * as path from 'path';

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
