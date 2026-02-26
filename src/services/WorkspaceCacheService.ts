import * as vscode from 'vscode';
import type { WorkspaceEntry } from '../models/WorkspaceEntry.js';
import { getCacheExpiration } from '../utils/configUtils.js';

export class WorkspaceCacheService {
  private cache: WorkspaceEntry[] | null = null;
  private cacheTimestamp = 0;

  private readonly _onDidExpire = new vscode.EventEmitter<void>();
  public readonly onDidExpire = this._onDidExpire.event;

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
  }

  /** Clear and notify listeners (for external invalidation). */
  invalidate(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
    this._onDidExpire.fire();
  }

  /** Clear without firing the event (used by DiscoveryService.refresh to avoid loops). */
  clear(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  dispose(): void {
    this._onDidExpire.dispose();
  }
}
