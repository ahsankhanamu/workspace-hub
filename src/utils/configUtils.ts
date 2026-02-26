import * as vscode from 'vscode';
import { CONFIG } from '../constants.js';
import type { ViewMode, SortField, SortDirection } from '../types.js';

function get<T>(key: string, defaultValue: T): T {
  return vscode.workspace.getConfiguration(CONFIG.section).get<T>(key, defaultValue);
}

export function getSearchFolders(): string[] {
  return get<string[]>(CONFIG.searchFolders, []);
}

export function getSearchDepth(): number {
  return get<number>(CONFIG.searchDepth, 5);
}

export function getExcludePatterns(): string[] {
  return get<string[]>(CONFIG.excludePatterns, [
    '**/node_modules/**', '**/.git/**', '**/bower_components/**',
    '**/.hg/**', '**/.svn/**', '**/dist/**', '**/build/**',
    '**/.next/**', '**/.nuxt/**',
  ]);
}

export function getIncludeGitFolders(): boolean {
  return get<boolean>(CONFIG.includeGitFolders, true);
}

export function getViewMode(): ViewMode {
  return get<ViewMode>(CONFIG.viewMode, 'tree');
}

export function getSortField(): SortField {
  return get<SortField>(CONFIG.sortField, 'name');
}

export function getSortDirection(): SortDirection {
  return get<SortDirection>(CONFIG.sortDirection, 'asc');
}

export function getShowStatusBar(): boolean {
  return get<boolean>(CONFIG.showStatusBar, true);
}

export function getStatusBarAlignment(): 'left' | 'right' {
  return get<'left' | 'right'>(CONFIG.statusBarAlignment, 'left');
}

export function getRecentCount(): number {
  return get<number>(CONFIG.recentCount, 10);
}

export function getCacheExpiration(): number {
  return get<number>(CONFIG.cacheExpiration, 300);
}

export function getShowFileIcons(): boolean {
  return get<boolean>(CONFIG.showFileIcons, true);
}

export function getCondenseFolders(): boolean {
  return get<boolean>(CONFIG.condenseFolders, true);
}

export function getConfirmDelete(): boolean {
  return get<boolean>(CONFIG.confirmDelete, true);
}

export function getAutoRefresh(): boolean {
  return get<boolean>(CONFIG.autoRefresh, true);
}

export function getStatusBarPriority(): number {
  return get<number>(CONFIG.statusBarPriority, 100);
}

export function getQuickSwitchShowRecent(): boolean {
  return get<boolean>(CONFIG.quickSwitchShowRecent, true);
}

export async function updateConfig<T>(key: string, value: T): Promise<void> {
  await vscode.workspace.getConfiguration(CONFIG.section).update(key, value, vscode.ConfigurationTarget.Global);
}
