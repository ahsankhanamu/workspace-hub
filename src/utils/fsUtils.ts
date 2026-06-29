import * as fs from 'fs/promises';
import * as path from 'path';
import { parse, ParseError } from 'jsonc-parser';

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getFileStat(filePath: string): Promise<{ mtimeMs: number } | undefined> {
  try {
    const stat = await fs.stat(filePath);
    return { mtimeMs: stat.mtimeMs };
  } catch {
    return undefined;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const errors: ParseError[] = [];
    const parsed = parse(content, errors, { allowTrailingComma: true });
    
    // Even if there are syntax errors (like an extra curly brace),
    // jsonc-parser often manages to parse the valid parts.
    // We'll return what it successfully extracted.
    if (parsed) {
      return parsed as T;
    }
    
    return undefined;
  } catch {
    return undefined;
  }
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function deleteFile(filePath: string): Promise<void> {
  await fs.unlink(filePath);
}

export async function copyFile(src: string, dest: string): Promise<void> {
  await fs.copyFile(src, dest);
}

export async function renameFile(oldPath: string, newPath: string): Promise<void> {
  await fs.rename(oldPath, newPath);
}

/**
 * Rewrite folder entries so they resolve to the same absolute paths after
 * the workspace file moves from oldWorkspaceDir to newWorkspaceDir.
 */
export function rewriteWorkspaceFolderPaths<T extends { path: string }>(
  folders: T[],
  oldWorkspaceDir: string,
  newWorkspaceDir: string,
): T[] {
  return folders.map(folder => {
    const absolutePath = path.isAbsolute(folder.path)
      ? folder.path
      : path.resolve(oldWorkspaceDir, folder.path);
    const newRelPath = path.relative(newWorkspaceDir, absolutePath) || '.';
    return { ...folder, path: newRelPath };
  });
}

/**
 * Parse a .code-workspace file to extract folder paths.
 */
export async function parseWorkspaceFile(filePath: string): Promise<string[]> {
  const data = await readJsonFile<{ folders?: Array<{ path: string }> }>(filePath);
  if (!data?.folders) {
    return [];
  }
  const dir = path.dirname(filePath);
  return data.folders.map(f => path.resolve(dir, f.path));
}
