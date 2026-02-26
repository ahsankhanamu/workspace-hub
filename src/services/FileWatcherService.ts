import * as vscode from 'vscode';
import { getSearchFolders, getAutoRefresh } from '../utils/configUtils.js';

export class FileWatcherService {
  private watchers: vscode.FileSystemWatcher[] = [];

  private readonly _onDidChange = new vscode.EventEmitter<void>();
  public readonly onDidChange = this._onDidChange.event;

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  setup(): void {
    this.disposeWatchers();

    if (!getAutoRefresh()) {
      return;
    }

    const searchFolders = getSearchFolders();
    for (const folder of searchFolders) {
      const resolved = folder.startsWith('~')
        ? folder.replace('~', process.env.HOME || process.env.USERPROFILE || '')
        : folder;

      const pattern = new vscode.RelativePattern(vscode.Uri.file(resolved), '**/*.code-workspace');
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);

      watcher.onDidCreate(() => this.debouncedFire());
      watcher.onDidDelete(() => this.debouncedFire());
      watcher.onDidChange(() => this.debouncedFire());

      this.watchers.push(watcher);
    }
  }

  private debouncedFire(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this._onDidChange.fire();
    }, 500);
  }

  private disposeWatchers(): void {
    for (const w of this.watchers) {
      w.dispose();
    }
    this.watchers = [];
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.disposeWatchers();
    this._onDidChange.dispose();
  }
}
