import * as vscode from 'vscode';
import type { WorkspaceStateService } from '../services/WorkspaceStateService.js';
import type { WorkspaceDiscoveryService } from '../services/WorkspaceDiscoveryService.js';
import { WorkspaceTreeItem, GroupTreeItem, BareFolderTreeItem } from '../models/TreeItems.js';

export function createOrganizationCommands(
  stateService: WorkspaceStateService,
  discoveryService: WorkspaceDiscoveryService,
) {
  const getPath = (item?: WorkspaceTreeItem | BareFolderTreeItem) => {
    if (item instanceof BareFolderTreeItem) return item.folderPath;
    if (item?.workspace) return item.workspace.filePath;
    return undefined;
  };
  
  const getName = (item?: WorkspaceTreeItem | BareFolderTreeItem) => {
    if (item instanceof BareFolderTreeItem) return item.folderName;
    if (item?.workspace) return item.workspace.name;
    return undefined;
  };

  return {
    toggleFavorite: async (item?: WorkspaceTreeItem | BareFolderTreeItem) => {
      const p = getPath(item);
      if (!p) return;
      await stateService.toggleFavorite(p);
    },

    removeFavorite: async (item?: WorkspaceTreeItem | BareFolderTreeItem) => {
      const p = getPath(item);
      if (!p) return;
      await stateService.removeFavorite(p);
    },

    togglePin: async (item?: WorkspaceTreeItem | BareFolderTreeItem) => {
      const p = getPath(item);
      if (!p) return;
      const added = await stateService.togglePin(p);
      vscode.window.showInformationMessage(
        added ? `Pinned "${getName(item)}"` : `Unpinned "${getName(item)}"`,
      );
    },

    removePin: async (item?: WorkspaceTreeItem | BareFolderTreeItem) => {
      const p = getPath(item);
      if (!p) return;
      await stateService.removePin(p);
    },

    addToGroup: async (item?: WorkspaceTreeItem | BareFolderTreeItem) => {
      const p = getPath(item);
      if (!p) return;
      const groups = stateService.getGroups();

      if (groups.length === 0) {
        const name = await vscode.window.showInputBox({ prompt: 'Enter group name' });
        if (!name) { return; }
        const group = await stateService.createGroup(name);
        await stateService.addToGroup(group.id, p);
        return;
      }

      const picks = groups.map(g => ({
        label: g.name,
        description: `${g.workspacePaths.length} workspace(s)`,
        groupId: g.id,
      }));
      picks.push({ label: '$(add) Create New Group...', description: '', groupId: '__new__' });

      const selected = await vscode.window.showQuickPick(picks, {
        placeHolder: 'Select a group',
      });

      if (!selected) { return; }

      if (selected.groupId === '__new__') {
        const name = await vscode.window.showInputBox({ prompt: 'Enter group name' });
        if (!name) { return; }
        const group = await stateService.createGroup(name);
        await stateService.addToGroup(group.id, p);
      } else {
        await stateService.addToGroup(selected.groupId, p);
      }
    },

    removeFromGroup: async (item?: WorkspaceTreeItem | BareFolderTreeItem) => {
      const p = getPath(item);
      if (!p) return;
      const groups = stateService.getGroupsForWorkspace(p);
      if (groups.length === 1) {
        await stateService.removeFromGroup(groups[0].id, p);
      } else if (groups.length > 1) {
        const selected = await vscode.window.showQuickPick(
          groups.map(g => ({ label: g.name, groupId: g.id })),
          { placeHolder: 'Remove from which group?' },
        );
        if (selected) {
          await stateService.removeFromGroup(selected.groupId, p);
        }
      }
    },

    createGroup: async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter group name',
        placeHolder: 'My Group',
      });
      if (!name) { return; }
      await stateService.createGroup(name.trim());
    },

    renameGroup: async (item?: GroupTreeItem) => {
      if (!item?.group) { return; }
      const newName = await vscode.window.showInputBox({
        prompt: 'Enter new group name',
        value: item.group.name,
      });
      if (newName && newName !== item.group.name) {
        await stateService.renameGroup(item.group.id, newName.trim());
      }
    },

    deleteGroup: async (item?: GroupTreeItem) => {
      if (!item?.group) { return; }
      const answer = await vscode.window.showWarningMessage(
        `Delete group "${item.group.name}"?`,
        { modal: true },
        'Delete',
      );
      if (answer === 'Delete') {
        await stateService.deleteGroup(item.group.id);
      }
    },

    setGroupColor: async (item?: GroupTreeItem) => {
      if (!item?.group) { return; }
      const colors = [
        { label: '$(circle-filled) Red', value: 'charts.red' },
        { label: '$(circle-filled) Blue', value: 'charts.blue' },
        { label: '$(circle-filled) Green', value: 'charts.green' },
        { label: '$(circle-filled) Yellow', value: 'charts.yellow' },
        { label: '$(circle-filled) Orange', value: 'charts.orange' },
        { label: '$(circle-filled) Purple', value: 'charts.purple' },
      ];
      const selected = await vscode.window.showQuickPick(colors, {
        placeHolder: 'Select group color',
      });
      if (selected) {
        await stateService.setGroupColor(item.group.id, selected.value);
      }
    },

  };
}
