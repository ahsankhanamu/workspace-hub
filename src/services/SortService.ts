import type { WorkspaceEntry } from '../models/WorkspaceEntry.js';
import type { SortField, SortDirection } from '../types.js';
import type { WorkspaceStateService } from './WorkspaceStateService.js';

export class SortService {
  constructor(private readonly stateService: WorkspaceStateService) {}

  sort(entries: WorkspaceEntry[], field: SortField, direction: SortDirection): WorkspaceEntry[] {
    const sorted = [...entries];
    const dir = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let cmp: number;
      switch (field) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'lastModified':
          cmp = a.lastModified - b.lastModified;
          break;
        case 'lastOpened': {
          const recents = this.stateService.getRecents();
          const aRecent = recents.find(r => r.filePath === a.filePath);
          const bRecent = recents.find(r => r.filePath === b.filePath);
          cmp = (aRecent?.timestamp ?? 0) - (bRecent?.timestamp ?? 0);
          break;
        }
        case 'frequency': {
          const aCount = this.stateService.getOpenCount(a.filePath);
          const bCount = this.stateService.getOpenCount(b.filePath);
          cmp = aCount - bCount;
          break;
        }
        default:
          cmp = 0;
      }
      return cmp * dir;
    });

    return sorted;
  }
}
