import { describe, it, expect, vi } from 'vitest';
import { SortService } from '../../src/services/SortService.js';
import { WorkspaceEntry } from '../../src/models/WorkspaceEntry.js';

describe('SortService', () => {
  const mockStateService = {
    getRecents: () => [
      { filePath: '/b', timestamp: 200 },
      { filePath: '/a', timestamp: 100 },
    ],
    getOpenCount: (path: string) => {
      const counts: Record<string, number> = { '/a': 5, '/b': 2, '/c': 10 };
      return counts[path] ?? 0;
    },
  } as any;

  const sortService = new SortService(mockStateService);

  const entries = [
    new WorkspaceEntry({ filePath: '/c', name: 'Charlie', isWorkspaceFile: true, lastModified: 300, folders: [] }),
    new WorkspaceEntry({ filePath: '/a', name: 'Alpha', isWorkspaceFile: true, lastModified: 100, folders: [] }),
    new WorkspaceEntry({ filePath: '/b', name: 'Bravo', isWorkspaceFile: true, lastModified: 200, folders: [] }),
  ];

  it('sorts by name ascending', () => {
    const sorted = sortService.sort(entries, 'name', 'asc');
    expect(sorted.map(e => e.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('sorts by name descending', () => {
    const sorted = sortService.sort(entries, 'name', 'desc');
    expect(sorted.map(e => e.name)).toEqual(['Charlie', 'Bravo', 'Alpha']);
  });

  it('sorts by lastModified ascending', () => {
    const sorted = sortService.sort(entries, 'lastModified', 'asc');
    expect(sorted.map(e => e.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('sorts by frequency descending', () => {
    const sorted = sortService.sort(entries, 'frequency', 'desc');
    expect(sorted.map(e => e.name)).toEqual(['Charlie', 'Alpha', 'Bravo']);
  });
});
