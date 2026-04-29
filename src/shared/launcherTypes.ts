export type TerminalSeriesId = 'gascii' | 'mienjine';
export type AssetMode = 'youtube' | 'asset-list';
export type LibraryDirKey = 'video' | 'audio' | 'music' | 'glb' | 'camera' | 'stage' | 'vmd' | 'pmx';
export type LauncherSettingKey = 'hwAccel' | 'autoClean' | 'highRes' | 'physics';

export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export type LauncherConfig = {
  version: 1;
  global: {
    language: 'ko' | 'en' | 'ja';
    autoUpdate: boolean;
  };
  series: Record<TerminalSeriesId, {
    installPath: string;
    options: Partial<Record<LauncherSettingKey, boolean>>;
  }>;
};

export type SelectInstallPathResponse = Result<{
  path: string;
}>;

export type SetSeriesOptionRequest = {
  seriesId: TerminalSeriesId;
  key: LauncherSettingKey;
  value: boolean;
};

export type SetSeriesOptionResponse = Result<{
  seriesId: TerminalSeriesId;
  key: LauncherSettingKey;
  value: boolean;
}>;

export type DirSummary = {
  dirKey: LibraryDirKey;
  fileCount: number;
  sizeBytes: number;
  exists: boolean;
};

export type GetDirSummaryResponse = Result<DirSummary[]>;

export type AssetInfo = {
  id: string;
  name: string;
  type: string;
  sizeBytes: number;
};

export type GetAssetListResponse = Result<AssetInfo[]>;
