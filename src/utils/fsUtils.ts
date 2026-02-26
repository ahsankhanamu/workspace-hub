import * as fs from 'fs/promises';
import * as path from 'path';

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
    return JSON.parse(content) as T;
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
