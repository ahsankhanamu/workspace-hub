import * as vscode from 'vscode';
import type { WorkspaceDiscoveryService } from '../services/WorkspaceDiscoveryService.js';
import type { WorkspaceStateService } from '../services/WorkspaceStateService.js';
import type { WorkspaceEntry } from '../models/WorkspaceEntry.js';
import { getQuickSwitchShowRecent } from '../utils/configUtils.js';
import { displayPath } from '../utils/pathUtils.js';

interface WorkspaceQuickPickItem extends vscode.QuickPickItem {
  workspace?: WorkspaceEntry;
}

export class QuickPickManager {
  constructor(
    private readonly discoveryService: WorkspaceDiscoveryService,
    private readonly stateService: WorkspaceStateService,
  ) {}

  async showQuickSwitch(): Promise<WorkspaceEntry | undefined> {
    const allWorkspaces = await this.discoveryService.getWorkspaces();
    const pinned = this.stateService.getPinned();
    const recents = this.stateService.getRecents();
    const favorites = this.stateService.getFavorites();

    const items: WorkspaceQuickPickItem[] = [];
    const addedPaths = new Set<string>();

    // Pinned section
    const pinnedEntries = allWorkspaces.filter(w => pinned.includes(w.filePath));
    if (pinnedEntries.length > 0) {
      items.push({ label: 'Pinned', kind: vscode.QuickPickItemKind.Separator });
      for (const entry of pinnedEntries) {
        items.push(this.createItem(entry, '$(pinned)'));
        addedPaths.add(entry.filePath);
      }
    }

    // Recent section
    if (getQuickSwitchShowRecent() && recents.length > 0) {
      const recentItems: WorkspaceQuickPickItem[] = [];
      for (const recent of recents) {
        if (addedPaths.has(recent.filePath)) {
          continue;
        }
        const entry = allWorkspaces.find(w => w.filePath === recent.filePath);
        if (entry) {
          recentItems.push(this.createItem(entry, '$(history)'));
          addedPaths.add(entry.filePath);
        }
      }
      if (recentItems.length > 0) {
        items.push({ label: 'Recent', kind: vscode.QuickPickItemKind.Separator });
        items.push(...recentItems);
      }
    }

    // All workspaces section
    const remainingItems: WorkspaceQuickPickItem[] = [];
    for (const entry of allWorkspaces) {
      if (addedPaths.has(entry.filePath)) {
        continue;
      }
      const icon = favorites.includes(entry.filePath) ? '$(star-full)' : '$(folder)';
      remainingItems.push(this.createItem(entry, icon));
    }
    if (remainingItems.length > 0) {
      items.push({ label: 'All Workspaces', kind: vscode.QuickPickItemKind.Separator });
      items.push(...remainingItems);
    }

    const quickPick = vscode.window.createQuickPick<WorkspaceQuickPickItem>();
    quickPick.items = items;
    quickPick.placeholder = 'Search workspaces...';
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    return new Promise<WorkspaceEntry | undefined>(resolve => {
      quickPick.onDidAccept(() => {
        const selected = quickPick.selectedItems[0];
        quickPick.dispose();
        resolve(selected?.workspace);
      });
      quickPick.onDidHide(() => {
        quickPick.dispose();
        resolve(undefined);
      });
      quickPick.show();
    });
  }

  async showSearch(): Promise<WorkspaceEntry | undefined> {
    const allWorkspaces = await this.discoveryService.getWorkspaces();
    const items: WorkspaceQuickPickItem[] = allWorkspaces.map(entry => this.createItem(entry, '$(folder)'));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Search workspaces by name or path...',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    return selected?.workspace;
  }

  private createItem(entry: WorkspaceEntry, icon: string): WorkspaceQuickPickItem {
    return {
      label: `${icon} ${entry.name}`,
      description: displayPath(entry.directory),
      detail: entry.isWorkspaceFile ? 'Workspace file' : 'Git repository',
      workspace: entry,
    };
  }
}
