import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { rewriteWorkspaceFolderPaths } from '../../src/utils/fsUtils.js';

describe('rewriteWorkspaceFolderPaths', () => {
  it('rewrites relative paths when the workspace file moves', () => {
    const oldDir = '/projects/my-app';
    const newDir = '/archive';

    const folders = rewriteWorkspaceFolderPaths(
      [{ path: '../shared-lib' }, { path: './src' }],
      oldDir,
      newDir,
    );

    expect(folders[0].path).toBe(path.join('..', 'projects', 'shared-lib'));
    expect(folders[1].path).toBe(path.join('..', 'projects', 'my-app', 'src'));
  });

  it('keeps absolute paths stable by recomputing relatives from the new location', () => {
    const folders = rewriteWorkspaceFolderPaths(
      [{ path: '/Users/dev/shared-lib' }],
      '/projects/my-app',
      '/archive',
    );

    expect(folders[0].path).toBe(path.relative('/archive', '/Users/dev/shared-lib'));
  });

  it('uses "." when the folder resolves to the destination directory', () => {
    const folders = rewriteWorkspaceFolderPaths(
      [{ path: '..' }],
      '/projects/my-app/sub',
      '/projects/my-app',
    );

    expect(folders[0].path).toBe('.');
  });
});
