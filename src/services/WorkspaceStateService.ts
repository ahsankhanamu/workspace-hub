import * as vscode from 'vscode';
import { STATE, CTX } from '../constants.js';
import type { GroupData, RecentEntry } from '../types.js';
import { GroupEntry } from '../models/GroupEntry.js';
import { getRecentCount } from '../utils/configUtils.js';

export class WorkspaceStateService {
  private readonly _onDidChangeState = new vscode.EventEmitter<void>();
  public readonly onDidChangeState = this._onDidChangeState.event;

  constructor(private readonly globalState: vscode.Memento) {}

  // ── Favorites ──────────────────────────────────────────

  getFavorites(): string[] {
    return this.globalState.get<string[]>(STATE.favorites, []);
  }

  isFavorite(filePath: string): boolean {
    return this.getFavorites().includes(filePath);
  }

  async toggleFavorite(filePath: string): Promise<boolean> {
    const favorites = this.getFavorites();
    const index = favorites.indexOf(filePath);
    if (index >= 0) {
      favorites.splice(index, 1);
    } else {
      favorites.push(filePath);
    }
    await this.globalState.update(STATE.favorites, favorites);
    await vscode.commands.executeCommand('setContext', CTX.hasFavorites, favorites.length > 0);
    this._onDidChangeState.fire();
    return index < 0; // returns true if added
  }

  async removeFavorite(filePath: string): Promise<void> {
    const favorites = this.getFavorites();
    const index = favorites.indexOf(filePath);
    if (index >= 0) {
      favorites.splice(index, 1);
      await this.globalState.update(STATE.favorites, favorites);
      await vscode.commands.executeCommand('setContext', CTX.hasFavorites, favorites.length > 0);
      this._onDidChangeState.fire();
    }
  }

  // ── Pinned ─────────────────────────────────────────────

  getPinned(): string[] {
    return this.globalState.get<string[]>(STATE.pinned, []);
  }

  isPinned(filePath: string): boolean {
    return this.getPinned().includes(filePath);
  }

  async togglePin(filePath: string): Promise<boolean> {
    const pinned = this.getPinned();
    const index = pinned.indexOf(filePath);
    if (index >= 0) {
      pinned.splice(index, 1);
    } else {
      pinned.push(filePath);
    }
    await this.globalState.update(STATE.pinned, pinned);
    await vscode.commands.executeCommand('setContext', CTX.hasPinned, pinned.length > 0);
    this._onDidChangeState.fire();
    return index < 0;
  }

  async removePin(filePath: string): Promise<void> {
    const pinned = this.getPinned();
    const index = pinned.indexOf(filePath);
    if (index >= 0) {
      pinned.splice(index, 1);
      await this.globalState.update(STATE.pinned, pinned);
      await vscode.commands.executeCommand('setContext', CTX.hasPinned, pinned.length > 0);
      this._onDidChangeState.fire();
    }
  }

  // ── Groups ─────────────────────────────────────────────

  getGroups(): GroupEntry[] {
    const data = this.globalState.get<GroupData[]>(STATE.groups, []);
    return data.map(d => new GroupEntry(d));
  }

  getGroupById(id: string): GroupEntry | undefined {
    return this.getGroups().find(g => g.id === id);
  }

  getGroupsForWorkspace(filePath: string): GroupEntry[] {
    return this.getGroups().filter(g => g.workspacePaths.includes(filePath));
  }

  async createGroup(name: string, color?: string): Promise<GroupEntry> {
    const groups = this.getGroups();
    const group = GroupEntry.create(name, color);
    groups.push(group);
    await this.saveGroups(groups);
    return group;
  }

  async renameGroup(id: string, newName: string): Promise<void> {
    const groups = this.getGroups();
    const group = groups.find(g => g.id === id);
    if (group) {
      group.name = newName;
      await this.saveGroups(groups);
    }
  }

  async deleteGroup(id: string): Promise<void> {
    const groups = this.getGroups().filter(g => g.id !== id);
    await this.saveGroups(groups);
  }

  async setGroupColor(id: string, color: string): Promise<void> {
    const groups = this.getGroups();
    const group = groups.find(g => g.id === id);
    if (group) {
      group.color = color;
      await this.saveGroups(groups);
    }
  }

  async addToGroup(groupId: string, filePath: string): Promise<void> {
    const groups = this.getGroups();
    const group = groups.find(g => g.id === groupId);
    if (group && !group.workspacePaths.includes(filePath)) {
      group.workspacePaths.push(filePath);
      await this.saveGroups(groups);
    }
  }

  async removeFromGroup(groupId: string, filePath: string): Promise<void> {
    const groups = this.getGroups();
    const group = groups.find(g => g.id === groupId);
    if (group) {
      group.workspacePaths = group.workspacePaths.filter(p => p !== filePath);
      await this.saveGroups(groups);
    }
  }

  private async saveGroups(groups: GroupEntry[]): Promise<void> {
    await this.globalState.update(STATE.groups, groups.map(g => g.toJSON()));
    this._onDidChangeState.fire();
  }

  // ── Recents ────────────────────────────────────────────

  getRecents(): RecentEntry[] {
    return this.globalState.get<RecentEntry[]>(STATE.recents, []);
  }

  async addRecent(filePath: string): Promise<void> {
    const maxCount = getRecentCount();
    let recents = this.getRecents().filter(r => r.filePath !== filePath);
    recents.unshift({ filePath, timestamp: Date.now() });
    recents = recents.slice(0, maxCount);
    await this.globalState.update(STATE.recents, recents);
    this._onDidChangeState.fire();
  }

  async clearRecents(): Promise<void> {
    await this.globalState.update(STATE.recents, []);
    this._onDidChangeState.fire();
  }

  // ── Open Counts (frequency) ────────────────────────────

  getOpenCounts(): Record<string, number> {
    return this.globalState.get<Record<string, number>>(STATE.openCounts, {});
  }

  getOpenCount(filePath: string): number {
    return this.getOpenCounts()[filePath] ?? 0;
  }

  async incrementOpenCount(filePath: string): Promise<void> {
    const counts = this.getOpenCounts();
    counts[filePath] = (counts[filePath] ?? 0) + 1;
    await this.globalState.update(STATE.openCounts, counts);
  }

  // ── Init context ───────────────────────────────────────

  async initContext(): Promise<void> {
    await vscode.commands.executeCommand('setContext', CTX.hasFavorites, this.getFavorites().length > 0);
    await vscode.commands.executeCommand('setContext', CTX.hasPinned, this.getPinned().length > 0);
  }

  dispose(): void {
    this._onDidChangeState.dispose();
  }
}
