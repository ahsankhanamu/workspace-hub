import { describe, it, expect } from 'vitest';
import { displayPath, workspaceNameFromPath, buildConsumedFolderPaths } from '../../src/utils/pathUtils.js';
import { WorkspaceEntry } from '../../src/models/WorkspaceEntry.js';
import * as path from 'path';

describe('pathUtils', () => {
  it('extracts workspace name from .code-workspace file', () => {
    expect(workspaceNameFromPath('/home/user/my-project.code-workspace')).toBe('my-project');
  });

  it('extracts folder name from regular path', () => {
    expect(workspaceNameFromPath('/home/user/my-repo')).toBe('my-repo');
  });

  it('displays path with tilde for home directory', () => {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    if (home) {
      expect(displayPath(`${home}/projects/test`)).toBe('~/projects/test');
    }
  });
});

describe('buildConsumedFolderPaths', () => {
  it('marks implied container directories covered by a workspace file', () => {
    const projectsDir = '/Users/dev/projects';
    const entry = WorkspaceEntry.fromWorkspaceFile(
      path.join(projectsDir, 'ide-extensions.code-workspace'),
      0,
      [
        path.join(projectsDir, 'ide-extensions', 'workspace-hub'),
        path.join(projectsDir, 'ide-extensions', 'vscode-notes'),
      ],
    );

    const consumed = buildConsumedFolderPaths([entry]);

    expect(consumed.has(path.join(projectsDir, 'ide-extensions', 'workspace-hub'))).toBe(true);
    expect(consumed.has(path.join(projectsDir, 'ide-extensions'))).toBe(true);
  });

  it('does not mark unrelated directories when folders span multiple roots', () => {
    const projectsDir = '/Users/dev/projects';
    const entry = WorkspaceEntry.fromWorkspaceFile(
      path.join(projectsDir, 'monorepo.code-workspace'),
      0,
      [
        path.join(projectsDir, 'monorepo', 'pkg-a'),
        path.join(projectsDir, 'other', 'pkg-b'),
      ],
    );

    const consumed = buildConsumedFolderPaths([entry]);

    expect(consumed.has(path.join(projectsDir, 'monorepo'))).toBe(false);
  });
});
