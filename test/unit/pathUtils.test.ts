import { describe, it, expect } from 'vitest';
import { displayPath, workspaceNameFromPath } from '../../src/utils/pathUtils.js';

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
