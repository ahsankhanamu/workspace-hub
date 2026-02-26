import { describe, it, expect } from 'vitest';
import { GroupEntry } from '../../src/models/GroupEntry.js';

describe('GroupEntry', () => {
  it('creates a new group with unique ID', () => {
    const group = GroupEntry.create('My Group', 'charts.blue');

    expect(group.name).toBe('My Group');
    expect(group.color).toBe('charts.blue');
    expect(group.id).toMatch(/^group_/);
    expect(group.workspacePaths).toEqual([]);
  });

  it('serializes to JSON', () => {
    const group = GroupEntry.create('Test');
    group.workspacePaths.push('/path/to/workspace');

    const json = group.toJSON();
    expect(json.name).toBe('Test');
    expect(json.workspacePaths).toEqual(['/path/to/workspace']);
    expect(json.id).toBe(group.id);
  });

  it('deserializes from JSON', () => {
    const data = {
      id: 'group_123',
      name: 'Restored',
      color: 'charts.red',
      workspacePaths: ['/a', '/b'],
    };

    const group = new GroupEntry(data);
    expect(group.id).toBe('group_123');
    expect(group.name).toBe('Restored');
    expect(group.workspacePaths).toEqual(['/a', '/b']);
  });
});
