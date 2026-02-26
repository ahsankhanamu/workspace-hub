import * as vscode from 'vscode';
import { CMD, VIEW_ID_ALL, VIEW_ID_FAVORITES, VIEW_ID_GROUPS, VIEW_ID_RECENT, VIEW_ID_PINNED, VIEW_ID_SEARCH_FOLDERS, CONFIG, CTX } from './constants.js';

// Services
import { WorkspaceCacheService } from './services/WorkspaceCacheService.js';
import { WorkspaceDiscoveryService } from './services/WorkspaceDiscoveryService.js';
import { WorkspaceStateService } from './services/WorkspaceStateService.js';
import { FileWatcherService } from './services/FileWatcherService.js';
import { SortService } from './services/SortService.js';
import { WorkspaceCrudService } from './services/WorkspaceCrudService.js';

// Providers
import { WorkspaceTreeProvider } from './providers/WorkspaceTreeProvider.js';
import { FavoritesTreeProvider } from './providers/FavoritesTreeProvider.js';
import { GroupsTreeProvider } from './providers/GroupsTreeProvider.js';
import { RecentTreeProvider } from './providers/RecentTreeProvider.js';
import { PinnedTreeProvider } from './providers/PinnedTreeProvider.js';
import { WorkspaceDecorationProvider } from './providers/WorkspaceDecorationProvider.js';
import { SearchFoldersTreeProvider } from './providers/SearchFoldersTreeProvider.js';

// UI
import { StatusBarManager } from './ui/StatusBarManager.js';
import { QuickPickManager } from './ui/QuickPickManager.js';
import { InputFlowManager } from './ui/InputFlowManager.js';

// Commands
import { openWorkspace } from './commands/openWorkspace.js';
import { createOrganizationCommands } from './commands/organizationCommands.js';
import { createCrudCommands } from './commands/crudCommands.js';
import { createUtilityCommands } from './commands/utilityCommands.js';
import { SearchFolderTreeItem } from './models/TreeItems.js';
import { getSearchFolders, updateConfig } from './utils/configUtils.js';

export function activate(context: vscode.ExtensionContext): void {
  // ── Services ──────────────────────────────────────
  const cacheService = new WorkspaceCacheService();
  const discoveryService = new WorkspaceDiscoveryService(cacheService);
  const stateService = new WorkspaceStateService(context.globalState);
  const fileWatcherService = new FileWatcherService();
  const sortService = new SortService(stateService);
  const crudService = new WorkspaceCrudService(discoveryService);

  // ── Providers ─────────────────────────────────────
  const workspaceTreeProvider = new WorkspaceTreeProvider(discoveryService, stateService, sortService);
  const favoritesTreeProvider = new FavoritesTreeProvider(discoveryService, stateService);
  const groupsTreeProvider = new GroupsTreeProvider(discoveryService, stateService);
  const recentTreeProvider = new RecentTreeProvider(discoveryService, stateService);
  const pinnedTreeProvider = new PinnedTreeProvider(discoveryService, stateService);
  const searchFoldersTreeProvider = new SearchFoldersTreeProvider();
  const decorationProvider = new WorkspaceDecorationProvider(stateService);

  // ── UI ────────────────────────────────────────────
  const statusBarManager = new StatusBarManager();
  const quickPickManager = new QuickPickManager(discoveryService, stateService);
  const inputFlowManager = new InputFlowManager();

  // ── Command Factories ─────────────────────────────
  const orgCmds = createOrganizationCommands(stateService, discoveryService);
  const crudCmds = createCrudCommands(crudService, inputFlowManager);
  const utilCmds = createUtilityCommands(workspaceTreeProvider, stateService);

  // ── Register Views ────────────────────────────────
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(VIEW_ID_ALL, workspaceTreeProvider),
    vscode.window.registerTreeDataProvider(VIEW_ID_FAVORITES, favoritesTreeProvider),
    vscode.window.registerTreeDataProvider(VIEW_ID_GROUPS, groupsTreeProvider),
    vscode.window.registerTreeDataProvider(VIEW_ID_RECENT, recentTreeProvider),
    vscode.window.registerTreeDataProvider(VIEW_ID_PINNED, pinnedTreeProvider),
    vscode.window.registerTreeDataProvider(VIEW_ID_SEARCH_FOLDERS, searchFoldersTreeProvider),
    vscode.window.registerFileDecorationProvider(decorationProvider),
  );

  // ── Register Commands ─────────────────────────────
  const registerCommand = (id: string, handler: (...args: any[]) => any) => {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));
  };

  // Core
  registerCommand(CMD.open, (item) => openWorkspace(stateService, item));
  registerCommand(CMD.openNewWindow, (item) => openWorkspace(stateService, item, true));

  // Quick switch & search
  registerCommand(CMD.quickSwitch, async () => {
    const entry = await quickPickManager.showQuickSwitch();
    if (entry) {
      openWorkspace(stateService, entry);
    }
  });
  registerCommand(CMD.search, async () => {
    const entry = await quickPickManager.showSearch();
    if (entry) {
      openWorkspace(stateService, entry);
    }
  });

  // Organization
  registerCommand(CMD.toggleFavorite, orgCmds.toggleFavorite);
  registerCommand(CMD.removeFavorite, orgCmds.removeFavorite);
  registerCommand(CMD.togglePin, orgCmds.togglePin);
  registerCommand(CMD.removePin, orgCmds.removePin);
  registerCommand(CMD.addToGroup, orgCmds.addToGroup);
  registerCommand(CMD.removeFromGroup, orgCmds.removeFromGroup);
  registerCommand(CMD.createGroup, orgCmds.createGroup);
  registerCommand(CMD.renameGroup, orgCmds.renameGroup);
  registerCommand(CMD.deleteGroup, orgCmds.deleteGroup);
  registerCommand(CMD.setGroupColor, orgCmds.setGroupColor);
  // CRUD
  registerCommand(CMD.create, crudCmds.create);
  registerCommand(CMD.delete, crudCmds.delete);
  registerCommand(CMD.rename, crudCmds.rename);
  registerCommand(CMD.duplicate, crudCmds.duplicate);

  // Utilities
  registerCommand(CMD.revealInOS, utilCmds.revealInOS);
  registerCommand(CMD.copyPath, utilCmds.copyPath);
  registerCommand(CMD.toggleViewMode, utilCmds.toggleViewMode);
  registerCommand(CMD.sortBy, utilCmds.sortBy);
  registerCommand(CMD.clearRecent, utilCmds.clearRecent);
  registerCommand(CMD.configureSearchFolders, utilCmds.configureSearchFolders);
  registerCommand(CMD.addSearchFolder, utilCmds.addSearchFolder);
  registerCommand(CMD.removeSearchFolder, utilCmds.removeSearchFolder);
  registerCommand(CMD.removeSearchFolderItem, async (item?: SearchFolderTreeItem) => {
    if (!item?.folderPath) { return; }
    const current = getSearchFolders();
    const remaining = current.filter(f => f !== item.folderPath);
    await updateConfig(CONFIG.searchFolders, remaining);
    await vscode.commands.executeCommand('setContext', CTX.hasSearchFolders, remaining.length > 0);
  });

  const toggleGitFoldersHandler = async () => {
    const current = vscode.workspace.getConfiguration(CONFIG.section).get<boolean>(CONFIG.includeGitFolders, true);
    await updateConfig(CONFIG.includeGitFolders, !current);
    await vscode.commands.executeCommand('setContext', CTX.includeGitFolders, !current);
  };
  registerCommand(CMD.toggleIncludeGitFolders, toggleGitFoldersHandler);
  registerCommand(CMD.toggleIncludeGitFoldersOff, toggleGitFoldersHandler);

  // Refresh
  registerCommand(CMD.refresh, () => {
    void discoveryService.refresh();
  });

  // Collapse all
  registerCommand(CMD.collapseAll, () => {
    void vscode.commands.executeCommand(`workbench.actions.treeView.${VIEW_ID_ALL}.collapseAll`);
  });

  // ── Event Wiring ──────────────────────────────────

  // Refresh all views helper
  const refreshAllViews = () => {
    workspaceTreeProvider.refresh();
    favoritesTreeProvider.refresh();
    groupsTreeProvider.refresh();
    recentTreeProvider.refresh();
    pinnedTreeProvider.refresh();
    searchFoldersTreeProvider.refresh();
    decorationProvider.refresh();
    statusBarManager.update();
  };

  // When workspaces are discovered/changed
  context.subscriptions.push(
    discoveryService.onDidChangeWorkspaces(() => refreshAllViews()),
  );

  // When state changes (favorites, groups, recents)
  context.subscriptions.push(
    stateService.onDidChangeState(() => refreshAllViews()),
  );

  // File watcher triggers refresh
  context.subscriptions.push(
    fileWatcherService.onDidChange(() => {
      void discoveryService.refresh();
    }),
  );

  // Cache expiration — just refresh the tree views so they re-fetch
  // (getWorkspaces() will rescan automatically on cache miss).
  // Do NOT call discoveryService.refresh() here — that calls cache.invalidate()
  // which fires onDidExpire again, causing infinite recursion.
  context.subscriptions.push(
    cacheService.onDidExpire(() => {
      refreshAllViews();
    }),
  );

  // Configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration(CONFIG.section)) {
        fileWatcherService.setup();
        statusBarManager.setup();
        const folders = vscode.workspace.getConfiguration(CONFIG.section).get<string[]>(CONFIG.searchFolders, []);
        void vscode.commands.executeCommand('setContext', CTX.hasSearchFolders, folders.length > 0);
        if (e.affectsConfiguration(`${CONFIG.section}.${CONFIG.searchFolders}`)
          || e.affectsConfiguration(`${CONFIG.section}.${CONFIG.includeGitFolders}`)) {
          void discoveryService.refresh();
        } else {
          refreshAllViews();
        }
      }
    }),
  );

  // ── Initialize ────────────────────────────────────

  // Set initial context values
  void stateService.initContext();
  void vscode.commands.executeCommand('setContext', CTX.viewMode, workspaceTreeProvider.getViewMode());
  const searchFolders = vscode.workspace.getConfiguration(CONFIG.section).get<string[]>(CONFIG.searchFolders, []);
  void vscode.commands.executeCommand('setContext', CTX.hasSearchFolders, searchFolders.length > 0);
  const includeGit = vscode.workspace.getConfiguration(CONFIG.section).get<boolean>(CONFIG.includeGitFolders, true);
  void vscode.commands.executeCommand('setContext', CTX.includeGitFolders, includeGit);

  // Setup file watcher and status bar
  fileWatcherService.setup();
  statusBarManager.setup();

  // ── Disposables ───────────────────────────────────
  context.subscriptions.push(
    cacheService,
    discoveryService,
    stateService,
    fileWatcherService,
    workspaceTreeProvider,
    favoritesTreeProvider,
    groupsTreeProvider,
    recentTreeProvider,
    pinnedTreeProvider,
    searchFoldersTreeProvider,
    decorationProvider,
    statusBarManager,
  );
}

export function deactivate(): void {
  // All disposables are cleaned up via context.subscriptions
}
