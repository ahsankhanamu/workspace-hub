// Mock VS Code API for unit testing with Vitest

export class EventEmitter {
  private listeners: Array<(...args: any[]) => void> = [];

  event = (listener: (...args: any[]) => void) => {
    this.listeners.push(listener);
    return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
  };

  fire(...args: any[]) {
    for (const listener of this.listeners) {
      listener(...args);
    }
  }

  dispose() {
    this.listeners = [];
  }
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export enum QuickPickItemKind {
  Separator = -1,
  Default = 0,
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export class TreeItem {
  label?: string;
  description?: string;
  tooltip?: string | MarkdownString;
  iconPath?: any;
  command?: any;
  contextValue?: string;
  resourceUri?: any;
  collapsibleState?: TreeItemCollapsibleState;

  constructor(labelOrUri: string | any, collapsibleState?: TreeItemCollapsibleState) {
    if (typeof labelOrUri === 'string') {
      this.label = labelOrUri;
    }
    this.collapsibleState = collapsibleState;
  }
}

export class ThemeIcon {
  static readonly File = new ThemeIcon('file');
  static readonly Folder = new ThemeIcon('folder');

  constructor(public readonly id: string, public readonly color?: ThemeColor) {}
}

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export class MarkdownString {
  value: string;
  isTrusted?: boolean;
  supportThemeIcons?: boolean;

  constructor(value = '', isTrusted = false) {
    this.value = value;
    this.isTrusted = isTrusted;
  }

  appendMarkdown(value: string) {
    this.value += value;
    return this;
  }

  appendText(value: string) {
    this.value += value;
    return this;
  }
}

export class Uri {
  static file(path: string) {
    return { fsPath: path, scheme: 'file', path };
  }
  static parse(value: string) {
    return { fsPath: value, scheme: 'file', path: value };
  }
}

export const workspace = {
  name: undefined as string | undefined,
  getConfiguration: (_section?: string) => ({
    get: <T>(_key: string, defaultValue?: T) => defaultValue,
    update: async () => {},
  }),
  createFileSystemWatcher: () => ({
    onDidCreate: () => ({ dispose: () => {} }),
    onDidDelete: () => ({ dispose: () => {} }),
    onDidChange: () => ({ dispose: () => {} }),
    dispose: () => {},
  }),
  onDidChangeConfiguration: () => ({ dispose: () => {} }),
};

export class RelativePattern {
  constructor(public base: any, public pattern: string) {}
}

export const window = {
  createStatusBarItem: () => ({
    text: '',
    tooltip: '',
    command: '',
    show: () => {},
    hide: () => {},
    dispose: () => {},
  }),
  createQuickPick: () => ({
    items: [],
    placeholder: '',
    matchOnDescription: false,
    matchOnDetail: false,
    onDidAccept: () => ({ dispose: () => {} }),
    onDidHide: () => ({ dispose: () => {} }),
    show: () => {},
    dispose: () => {},
    selectedItems: [],
  }),
  showQuickPick: async () => undefined,
  showInputBox: async () => undefined,
  showInformationMessage: async () => undefined,
  showWarningMessage: async () => undefined,
  showErrorMessage: async () => undefined,
  showOpenDialog: async () => undefined,
  registerTreeDataProvider: () => ({ dispose: () => {} }),
  registerFileDecorationProvider: () => ({ dispose: () => {} }),
};

export const commands = {
  registerCommand: (_id: string, _handler: (...args: any[]) => any) => ({
    dispose: () => {},
  }),
  executeCommand: async () => {},
};

export const env = {
  clipboard: {
    writeText: async () => {},
    readText: async () => '',
  },
};

export default {
  EventEmitter,
  TreeItemCollapsibleState,
  QuickPickItemKind,
  StatusBarAlignment,
  ConfigurationTarget,
  TreeItem,
  ThemeIcon,
  ThemeColor,
  MarkdownString,
  Uri,
  RelativePattern,
  workspace,
  window,
  commands,
  env,
};
