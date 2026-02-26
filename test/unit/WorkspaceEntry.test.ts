import { describe, it, expect } from 'vitest';
import { WorkspaceEntry } from '../../src/models/WorkspaceEntry.js';

describe('WorkspaceEntry', () => {
  it('creates from workspace file', () => {
    const entry = WorkspaceEntry.fromWorkspaceFile(
      '/home/user/projects/my-project.code-workspace',
      1000,
      ['/home/user/projects/src'],
    );

    expect(entry.name).toBe('my-project');
    expect(entry.isWorkspaceFile).toBe(true);
    expect(entry.filePath).toBe('/home/user/projects/my-project.code-workspace');
    expect(entry.directory).toBe('/home/user/projects');
    expect(entry.folders).toEqual(['/home/user/projects/src']);
  });

  it('creates from git folder', () => {
    const entry = WorkspaceEntry.fromGitFolder('/home/user/projects/my-repo', 2000);

    expect(entry.name).toBe('my-repo');
    expect(entry.isWorkspaceFile).toBe(false);
    expect(entry.filePath).toBe('/home/user/projects/my-repo');
  });

  it('computes relative segments', () => {
    const entry = WorkspaceEntry.fromWorkspaceFile(
      '/home/user/projects/frontend/app/my-app.code-workspace',
      1000,
    );

    const segments = entry.getRelativeSegments('/home/user/projects');
    expect(segments).toEqual(['frontend', 'app']);
  });

  it('returns empty segments for root-level workspace', () => {
    const entry = WorkspaceEntry.fromWorkspaceFile(
      '/home/user/projects/my-app.code-workspace',
      1000,
    );

    const segments = entry.getRelativeSegments('/home/user/projects');
    expect(segments).toEqual([]);
  });
});
