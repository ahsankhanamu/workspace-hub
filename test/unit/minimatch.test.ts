import { describe, it, expect } from 'vitest';
import { minimatch } from '../../src/utils/minimatch.js';

describe('minimatch', () => {
  it('matches double star glob patterns', () => {
    expect(minimatch('/home/user/projects/node_modules/pkg/index.js', '**/node_modules/**')).toBe(true);
    expect(minimatch('/home/user/projects/src/index.ts', '**/node_modules/**')).toBe(false);
  });

  it('matches single star', () => {
    expect(minimatch('/home/user/test.js', '/home/user/*.js')).toBe(true);
    expect(minimatch('/home/user/test.ts', '/home/user/*.js')).toBe(false);
  });

  it('matches .git directory exclusion', () => {
    expect(minimatch('/home/user/projects/.git/config', '**/.git/**')).toBe(true);
    expect(minimatch('/home/user/projects/src/file.ts', '**/.git/**')).toBe(false);
  });

  it('handles brace expansion', () => {
    expect(minimatch('/file.ts', '/*.{ts,js}')).toBe(true);
    expect(minimatch('/file.js', '/*.{ts,js}')).toBe(true);
    expect(minimatch('/file.py', '/*.{ts,js}')).toBe(false);
  });
});
