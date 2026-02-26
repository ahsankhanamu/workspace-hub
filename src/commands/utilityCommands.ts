import * as vscode from 'vscode';
import { WorkspaceTreeItem, SearchFolderTreeItem } from '../models/TreeItems.js';
import { CONFIG, CTX } from '../constants.js';
import type { WorkspaceTreeProvider } from '../providers/WorkspaceTreeProvider.js';
import type { WorkspaceStateService } from '../services/WorkspaceStateService.js';
import { updateConfig } from '../utils/configUtils.js';

export function createUtilityCommands(
  workspaceTreeProvider: WorkspaceTreeProvider,
  stateService: WorkspaceStateService,
) {
  return {
    revealInOS: (item?: WorkspaceTreeItem | SearchFolderTreeItem) => {
      if (item instanceof SearchFolderTreeItem) {
        void vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(item.folderPath));
        return;
      }
      if (!item || !('workspace' in item) || !item.workspace) { return; }
      void vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(item.workspace.filePath));
    },

    copyPath: (item?: WorkspaceTreeItem) => {
      if (!item?.workspace) { return; }
      void vscode.env.clipboard.writeText(item.workspace.filePath);
      vscode.window.showInformationMessage('Path copied to clipboard.');
    },

    toggleViewMode: async () => {
      workspaceTreeProvider.toggleViewMode();
      const mode = workspaceTreeProvider.getViewMode();
      await updateConfig(CONFIG.viewMode, mode);
      await vscode.commands.executeCommand('setContext', 'workspaceHub.viewMode', mode);
    },

    sortBy: async () => {
      const options = [
        { label: 'Name', value: 'name' },
        { label: 'Last Modified', value: 'lastModified' },
        { label: 'Last Opened', value: 'lastOpened' },
        { label: 'Frequency', value: 'frequency' },
      ];

      const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Sort workspaces by...',
      });

      if (selected) {
        await updateConfig(CONFIG.sortField, selected.value);

        const dirOptions = [
          { label: 'Ascending', value: 'asc' },
          { label: 'Descending', value: 'desc' },
        ];
        const dir = await vscode.window.showQuickPick(dirOptions, {
          placeHolder: 'Sort direction',
        });
        if (dir) {
          await updateConfig(CONFIG.sortDirection, dir.value);
        }

        workspaceTreeProvider.refresh();
      }
    },

    clearRecent: async () => {
      await stateService.clearRecents();
      vscode.window.showInformationMessage('Recent workspaces cleared.');
    },

    configureSearchFolders: async () => {
      const currentFolders = vscode.workspace.getConfiguration(CONFIG.section)
        .get<string[]>(CONFIG.searchFolders, []);

      const action = await vscode.window.showQuickPick(
        [
          { label: '$(add) Add Search Folders', value: 'add' as const },
          ...(currentFolders.length > 0
            ? [{ label: '$(trash) Remove Search Folders', value: 'remove' as const }]
            : []),
        ],
        { placeHolder: `Manage search folders (${currentFolders.length} configured)` },
      );

      if (!action) { return; }

      if (action.value === 'add') {
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: true,
          openLabel: 'Add Search Folder',
          title: 'Select folders to scan for workspaces',
        });

        if (uris && uris.length > 0) {
          const newFolders = [...new Set([...currentFolders, ...uris.map(u => u.fsPath)])];
          await updateConfig(CONFIG.searchFolders, newFolders);
          vscode.window.showInformationMessage(`Added ${uris.length} search folder(s).`);
        }
      } else {
        const items = currentFolders.map(folder => ({
          label: folder.replace(/^\/Users\/[^/]+/, '~'),
          description: folder,
          picked: false,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select folders to remove',
          canPickMany: true,
        });

        if (selected && selected.length > 0) {
          const toRemove = new Set(selected.map(s => s.description));
          const remaining = currentFolders.filter(f => !toRemove.has(f));
          await updateConfig(CONFIG.searchFolders, remaining);
          vscode.window.showInformationMessage(`Removed ${selected.length} search folder(s).`);
        }
      }
    },

    addSearchFolder: async () => {
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: true,
        openLabel: 'Add Search Folder',
        title: 'Select folders to scan for workspaces',
      });

      if (uris && uris.length > 0) {
        const currentFolders = vscode.workspace.getConfiguration(CONFIG.section)
          .get<string[]>(CONFIG.searchFolders, []);
        const newFolders = [...new Set([...currentFolders, ...uris.map(u => u.fsPath)])];
        await updateConfig(CONFIG.searchFolders, newFolders);
        await vscode.commands.executeCommand('setContext', CTX.hasSearchFolders, newFolders.length > 0);
        vscode.window.showInformationMessage(`Added ${uris.length} search folder(s).`);
      }
    },

    removeSearchFolder: async () => {
      const currentFolders = vscode.workspace.getConfiguration(CONFIG.section)
        .get<string[]>(CONFIG.searchFolders, []);

      if (currentFolders.length === 0) {
        vscode.window.showInformationMessage('No search folders configured.');
        return;
      }

      const items = currentFolders.map(folder => ({
        label: folder.replace(/^\/Users\/[^/]+/, '~'),
        description: folder,
        picked: false,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select folders to remove',
        canPickMany: true,
      });

      if (selected && selected.length > 0) {
        const toRemove = new Set(selected.map(s => s.description));
        const remaining = currentFolders.filter(f => !toRemove.has(f));
        await updateConfig(CONFIG.searchFolders, remaining);
        await vscode.commands.executeCommand('setContext', CTX.hasSearchFolders, remaining.length > 0);
        vscode.window.showInformationMessage(`Removed ${selected.length} search folder(s).`);
      }
    },
  };
}
