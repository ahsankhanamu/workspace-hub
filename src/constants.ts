// View IDs
export const VIEW_ID_PINNED = 'workspaceHub.pinned';
export const VIEW_ID_RECENT = 'workspaceHub.recent';
export const VIEW_ID_FAVORITES = 'workspaceHub.favorites';
export const VIEW_ID_GROUPS = 'workspaceHub.groups';
export const VIEW_ID_SEARCH_FOLDERS = 'workspaceHub.searchFolders';
export const VIEW_ID_ALL = 'workspaceHub.all';

// Command IDs
export const CMD = {
  open: 'workspaceHub.open',
  openNewWindow: 'workspaceHub.openNewWindow',
  create: 'workspaceHub.create',
  delete: 'workspaceHub.delete',
  rename: 'workspaceHub.rename',
  duplicate: 'workspaceHub.duplicate',
  toggleFavorite: 'workspaceHub.toggleFavorite',
  removeFavorite: 'workspaceHub.removeFavorite',
  togglePin: 'workspaceHub.togglePin',
  removePin: 'workspaceHub.removePin',
  addToGroup: 'workspaceHub.addToGroup',
  removeFromGroup: 'workspaceHub.removeFromGroup',
  createGroup: 'workspaceHub.createGroup',
  renameGroup: 'workspaceHub.renameGroup',
  deleteGroup: 'workspaceHub.deleteGroup',
  setGroupColor: 'workspaceHub.setGroupColor',
  quickSwitch: 'workspaceHub.quickSwitch',
  search: 'workspaceHub.search',
  revealInOS: 'workspaceHub.revealInOS',
  copyPath: 'workspaceHub.copyPath',
  toggleViewMode: 'workspaceHub.toggleViewMode',
  sortBy: 'workspaceHub.sortBy',
  refresh: 'workspaceHub.refresh',
  collapseAll: 'workspaceHub.collapseAll',
  clearRecent: 'workspaceHub.clearRecent',
  configureSearchFolders: 'workspaceHub.configureSearchFolders',
  addSearchFolder: 'workspaceHub.addSearchFolder',
  removeSearchFolder: 'workspaceHub.removeSearchFolder',
  removeSearchFolderItem: 'workspaceHub.removeSearchFolderItem',
  toggleIncludeGitFolders: 'workspaceHub.toggleIncludeGitFolders',
  toggleIncludeGitFoldersOff: 'workspaceHub.toggleIncludeGitFoldersOff',
} as const;

// Configuration keys
export const CONFIG = {
  section: 'workspaceHub',
  searchFolders: 'searchFolders',
  searchDepth: 'searchDepth',
  excludePatterns: 'excludePatterns',
  includeGitFolders: 'includeGitFolders',
  viewMode: 'viewMode',
  sortField: 'sortField',
  sortDirection: 'sortDirection',
  showStatusBar: 'showStatusBar',
  statusBarAlignment: 'statusBarAlignment',
  recentCount: 'recentCount',
  cacheExpiration: 'cacheExpiration',
  showFileIcons: 'showFileIcons',
  condenseFolders: 'condenseFolders',
  confirmDelete: 'confirmDelete',
  autoRefresh: 'autoRefresh',
  showPreviewOnHover: 'showPreviewOnHover',
  quickSwitchShowRecent: 'quickSwitchShowRecent',
  statusBarPriority: 'statusBarPriority',
} as const;

// State keys (for Memento)
export const STATE = {
  favorites: 'workspaceHub.favorites',
  pinned: 'workspaceHub.pinned',
  groups: 'workspaceHub.groups',
  recents: 'workspaceHub.recents',
  openCounts: 'workspaceHub.openCounts',
} as const;

// Context keys
export const CTX = {
  hasPinned: 'workspaceHub.hasPinned',
  hasFavorites: 'workspaceHub.hasFavorites',
  viewMode: 'workspaceHub.viewMode',
  hasSearchFolders: 'workspaceHub.hasSearchFolders',
  includeGitFolders: 'workspaceHub.includeGitFolders',
} as const;
