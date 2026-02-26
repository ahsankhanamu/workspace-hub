import type { GroupData } from '../types.js';

export class GroupEntry implements GroupData {
  public readonly id: string;
  public name: string;
  public color?: string;
  public workspacePaths: string[];

  constructor(data: GroupData) {
    this.id = data.id;
    this.name = data.name;
    this.color = data.color;
    this.workspacePaths = [...data.workspacePaths];
  }

  static create(name: string, color?: string): GroupEntry {
    return new GroupEntry({
      id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      color,
      workspacePaths: [],
    });
  }

  toJSON(): GroupData {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      workspacePaths: this.workspacePaths,
    };
  }
}
