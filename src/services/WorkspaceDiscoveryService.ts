import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { Dirent } from 'fs';
import { WorkspaceEntry } from '../models/WorkspaceEntry.js';
import { WorkspaceCacheService } from './WorkspaceCacheService.js';
import { getSearchFolders, getSearchDepth, getExcludePatterns, getIncludeGitFolders } from '../utils/configUtils.js';
import { parseWorkspaceFile } from '../utils/fsUtils.js';
import { compileExcludePatterns, isExcludedByCompiledRegex } from '../utils/minimatch.js';

/**
 * Max number of directories to scan concurrently.
 * Prevents exhausting file descriptor limits on large trees.
 */
const CONCURRENCY_LIMIT = 16;

export class WorkspaceDiscoveryService {
  private readonly _onDidChangeWorkspaces = new vscode.EventEmitter<void>();
  public readonly onDidChangeWorkspaces = this._onDidChangeWorkspaces.event;

  private scanPromise: Promise<WorkspaceEntry[]> | null = null;

  constructor(private readonly cache: WorkspaceCacheService) {}

  async getWorkspaces(forceRefresh = false): Promise<WorkspaceEntry[]> {
    if (!forceRefresh) {
      const cached = this.cache.get();
      if (cached) {
        return cached;
      }
    }

    const entries = await this.scan();
    this.cache.set(entries);
    return entries;
  }

  async refresh(): Promise<void> {
    this.cache.clear();
    const entries = await this.scan();
    this.cache.set(entries);
    this._onDidChangeWorkspaces.fire();
  }

  /**
   * Coalesces concurrent scan requests — if a scan is already running,
   * callers await the same promise instead of starting a duplicate scan.
   */
  private scan(): Promise<WorkspaceEntry[]> {
    if (this.scanPromise) {
      return this.scanPromise;
    }

    this.scanPromise = this.doScan().finally(() => {
      this.scanPromise = null;
    });
    return this.scanPromise;
  }

  /**
   * Primary scan strategy: use VS Code's `workspace.findFiles` (ripgrep-backed)
   * for .code-workspace files, with a manual parallel walk for .git detection.
   */
  private async doScan(): Promise<WorkspaceEntry[]> {
    const searchFolders = getSearchFolders();
    if (searchFolders.length === 0) {
      return [];
    }

    const maxDepth = getSearchDepth();
    const excludePatterns = getExcludePatterns();
    const includeGit = getIncludeGitFolders();

    // Pre-compile all exclude patterns into a single regex (tested once per path)
    const excludeRegex = compileExcludePatterns(excludePatterns);

    // Derive a set of directory basenames to skip early (fast O(1) check before regex)
    const skipDirNames = new Set<string>();
    for (const p of excludePatterns) {
      // Extract simple directory names like "node_modules" from "**/node_modules/**"
      const m = p.match(/^\*\*\/([a-zA-Z0-9_.-]+)\/\*\*$/);
      if (m) {
        skipDirNames.add(m[1]);
      }
    }

    const entries: WorkspaceEntry[] = [];
    const seen = new Set<string>();

    // Scan all root folders concurrently
    await Promise.all(
      searchFolders.map(folder => {
        const resolved = this.resolveFolder(folder);
        return this.scanDirectory(
          resolved, 0, maxDepth, excludeRegex, skipDirNames, includeGit, entries, seen,
        );
      }),
    );

    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }

  private resolveFolder(folder: string): string {
    if (folder.startsWith('~')) {
      const home = process.env.HOME || process.env.USERPROFILE || '';
      return path.join(home, folder.slice(1));
    }
    return folder;
  }

  /**
   * Parallel recursive directory scan.
   *
   * Key optimisations vs. the naïve approach:
   *  1. `readdir({ withFileTypes: true })` — returns Dirent objects, so the OS
   *     tells us file vs directory without an extra `stat()` per entry.
   *  2. Basename set for early skip — `node_modules`, `.git`, etc. are rejected
   *     with a single Set.has() before touching the filesystem or running regex.
   *  3. Pre-compiled combined exclude regex — one test per path instead of N.
   *  4. Parallel recursion into subdirectories (bounded by CONCURRENCY_LIMIT).
   *  5. Parallel `parseWorkspaceFile` for all .code-workspace files found at
   *     the same directory level.
   *  6. Scan coalescing — concurrent callers share a single in-flight scan.
   */
  private async scanDirectory(
    dir: string,
    depth: number,
    maxDepth: number,
    excludeRegex: RegExp | null,
    skipDirNames: Set<string>,
    includeGit: boolean,
    entries: WorkspaceEntry[],
    seen: Set<string>,
  ): Promise<void> {
    if (depth > maxDepth) {
      return;
    }

    let dirEntries: Dirent[];
    try {
      // withFileTypes avoids a stat() per entry — the kernel already knows the type
      dirEntries = await fs.readdir(dir, { withFileTypes: true }) as unknown as Dirent[];
    } catch {
      return;
    }

    let hasGit = false;
    const subdirs: string[] = [];
    const workspaceFiles: { fullPath: string; name: string }[] = [];

    for (const entry of dirEntries) {
      const name = String(entry.name);
      const fullPath = path.join(dir, name);

      if (entry.isDirectory()) {
        if (name === '.git') {
          hasGit = true;
          continue;
        }
        // Fast basename check before expensive regex
        if (name.startsWith('.') || skipDirNames.has(name)) {
          continue;
        }
        if (isExcludedByCompiledRegex(fullPath, excludeRegex)) {
          continue;
        }
        subdirs.push(fullPath);
      } else if (entry.isFile() && name.endsWith('.code-workspace')) {
        if (isExcludedByCompiledRegex(fullPath, excludeRegex)) {
          continue;
        }
        if (!seen.has(fullPath)) {
          seen.add(fullPath);
          workspaceFiles.push({ fullPath, name });
        }
      }
    }

    // Parse all workspace files found at this level in parallel
    if (workspaceFiles.length > 0) {
      const results = await Promise.all(
        workspaceFiles.map(async ({ fullPath }) => {
          const [folders, stat] = await Promise.all([
            parseWorkspaceFile(fullPath),
            fs.stat(fullPath).catch(() => null),
          ]);
          return WorkspaceEntry.fromWorkspaceFile(
            fullPath,
            stat?.mtimeMs ?? 0,
            folders,
          );
        }),
      );
      entries.push(...results);
    }

    // Register git folder as workspace
    if (includeGit && hasGit && !seen.has(dir)) {
      seen.add(dir);
      let mtimeMs = 0;
      try {
        mtimeMs = (await fs.stat(dir)).mtimeMs;
      } catch { /* ignore */ }
      entries.push(WorkspaceEntry.fromGitFolder(dir, mtimeMs));
    }

    // Recurse into subdirectories in parallel, bounded by concurrency limit
    if (subdirs.length > 0) {
      await parallelMap(subdirs, CONCURRENCY_LIMIT, subdir =>
        this.scanDirectory(subdir, depth + 1, maxDepth, excludeRegex, skipDirNames, includeGit, entries, seen),
      );
    }
  }

  dispose(): void {
    this._onDidChangeWorkspaces.dispose();
  }
}

/**
 * Run an async function over an array with bounded concurrency.
 * Avoids opening thousands of directory handles simultaneously.
 */
async function parallelMap<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length <= limit) {
    await Promise.all(items.map(fn));
    return;
  }

  let idx = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i]);
    }
  });
  await Promise.all(workers);
}
