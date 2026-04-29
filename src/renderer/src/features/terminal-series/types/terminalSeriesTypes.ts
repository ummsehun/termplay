export type TerminalSeriesStatus =
  | 'not-installed'
  | 'installed'
  | 'update-available'
  | 'installing'
  | 'updating'
  | 'running'
  | 'error';

export type TerminalSeriesAssetStatus =
  | 'not-installed'
  | 'installed'
  | 'missing'
  | 'outdated';

export type TerminalSeriesAsset = {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: TerminalSeriesAssetStatus;
  sizeLabel: string;
};

export type TerminalSeriesLog = {
  id: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
};

export type TerminalSeries = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  repositoryUrl: string;
  status: TerminalSeriesStatus;
  installedVersion: string | null;
  latestVersion: string;
  installPath: string | null;
  runtimeRequirements: string[];
  assets: TerminalSeriesAsset[];
  logs: TerminalSeriesLog[];
};

export type TerminalSeriesTab = 'overview' | 'assets' | 'logs' | 'settings';
