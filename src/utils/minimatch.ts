/**
 * Simple glob pattern matcher (no external dependencies).
 * Supports: *, **, ?, {a,b}
 *
 * Uses a compiled regex cache to avoid recompiling on every call.
 */

const regexCache = new Map<string, RegExp>();

export function minimatch(filePath: string, pattern: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');

  let regex = regexCache.get(pattern);
  if (!regex) {
    regex = globToRegex(pattern.replace(/\\/g, '/'));
    regexCache.set(pattern, regex);
  }

  return regex.test(normalizedPath);
}

/**
 * Pre-compile an array of glob patterns into a single combined regex.
 * Much faster than checking each pattern individually.
 */
export function compileExcludePatterns(patterns: string[]): RegExp | null {
  if (patterns.length === 0) {
    return null;
  }
  const parts = patterns.map(p => globToRegexString(p.replace(/\\/g, '/')));
  return new RegExp('(?:' + parts.join('|') + ')', 'i');
}

export function isExcludedByCompiledRegex(filePath: string, regex: RegExp | null): boolean {
  if (!regex) {
    return false;
  }
  return regex.test(filePath.replace(/\\/g, '/'));
}

function globToRegexString(pattern: string): string {
  let regex = '';
  let i = 0;

  while (i < pattern.length) {
    const c = pattern[i];

    if (c === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          regex += '(?:.*/)?';
          i += 3;
        } else {
          regex += '.*';
          i += 2;
        }
      } else {
        regex += '[^/]*';
        i++;
      }
    } else if (c === '?') {
      regex += '[^/]';
      i++;
    } else if (c === '{') {
      const end = pattern.indexOf('}', i);
      if (end !== -1) {
        const alternatives = pattern.slice(i + 1, end).split(',');
        regex += '(?:' + alternatives.map(escapeRegex).join('|') + ')';
        i = end + 1;
      } else {
        regex += escapeRegex(c);
        i++;
      }
    } else {
      regex += escapeRegex(c);
      i++;
    }
  }

  return '^' + regex + '$';
}

function globToRegex(pattern: string): RegExp {
  return new RegExp(globToRegexString(pattern), 'i');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
