import * as vscode from 'vscode';
import { WorkspaceEntry } from '../models/WorkspaceEntry.js';
import type { WorkspaceData } from '../types.js';
import { getCacheExpiration } from '../utils/configUtils.js';

const CACHE_KEY = 'workspaceHub.cache.entries';
const TIMESTAMP_KEY = 'workspaceHub.cache.timestamp';

export class WorkspaceCacheService {
  private cache: WorkspaceEntry[] | null = null;
  private cacheTimestamp = 0;

  private readonly _onDidExpire = new vscode.EventEmitter<void>();
  public readonly onDidExpire = this._onDidExpire.event;

  constructor(private readonly globalState: vscode.Memento) {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const data = this.globalState.get<WorkspaceData[]>(CACHE_KEY);
    const timestamp = this.globalState.get<number>(TIMESTAMP_KEY);

    if (data && Array.isArray(data) && timestamp) {
      this.cache = data.map(d => new WorkspaceEntry(d));
      this.cacheTimestamp = timestamp;
    }
  }

  get(): WorkspaceEntry[] | null {
    if (!this.cache) {
      return null;
    }

    const ttl = getCacheExpiration() * 1000;
    if (ttl > 0 && Date.now() - this.cacheTimestamp > ttl) {
      // Silently clear — the caller (getWorkspaces) will rescan.
      // Don't fire onDidExpire here to avoid re-entrant loops.
      this.clear();
      return null;
    }

    return this.cache;
  }

  set(entries: WorkspaceEntry[]): void {
    this.cache = entries;
    this.cacheTimestamp = Date.now();
    
    // Asynchronously save to storage to not block
    Promise.all([
      this.globalState.update(CACHE_KEY, entries.map(e => ({
        filePath: e.filePath,
        name: e.name,
        isWorkspaceFile: e.isWorkspaceFile,
        lastModified: e.lastModified,
        folders: e.folders
      }))),
      this.globalState.update(TIMESTAMP_KEY, this.cacheTimestamp)
    ]).catch(console.error);
  }

  /** Clear and notify listeners (for external invalidation). */
  invalidate(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
    this.globalState.update(CACHE_KEY, undefined);
    this.globalState.update(TIMESTAMP_KEY, undefined);
    this._onDidExpire.fire();
  }

  /** Clear without firing the event (used by DiscoveryService.refresh to avoid loops). */
  clear(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
    this.globalState.update(CACHE_KEY, undefined);
    this.globalState.update(TIMESTAMP_KEY, undefined);
  }

  dispose(): void {
    this._onDidExpire.dispose();
  }
}
