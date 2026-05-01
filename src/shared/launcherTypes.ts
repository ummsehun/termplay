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

export type GlobalSettingKey = keyof LauncherConfig['global'];
export type GlobalSettingValue<K extends GlobalSettingKey> = LauncherConfig['global'][K];

export type GasciiInstallInfo = {
  installedVersion: string;
  installPath: string;
  binaryPath: string;
  lastInstalledAt: string;
};

export type SeriesRuntimeState = {
  gascii?: GasciiInstallInfo;
};

export type SeriesStatusInfo = {
  seriesId: TerminalSeriesId;
  installedVersion: string | null;
  latestVersion: string | null;
  installPath: string | null;
  binaryPath: string | null;
  status: 'not-installed' | 'installed' | 'update-available';
};

export type SeriesVerifyResult = {
  seriesId: TerminalSeriesId;
  ok: boolean;
  checkedPaths: string[];
  missing: string[];
  message: string;
};

export type SeriesInstallStage =
  | 'resolving'
  | 'downloading'
  | 'extracting'
  | 'permissions'
  | 'completed'
  | 'failed';

export type SeriesInstallProgress = {
  seriesId: TerminalSeriesId;
  stage: SeriesInstallStage;
  progress: number;
  message: string;
  version?: string;
  error?: string;
};

export type SeriesLaunchStage =
  | 'resolving'
  | 'checking-installation'
  | 'checking-version'
  | 'verifying-binary'
  | 'preparing-permissions'
  | 'preparing-terminal'
  | 'launching'
  | 'completed'
  | 'failed';

export type SeriesLaunchProgress = {
  seriesId: TerminalSeriesId;
  stage: SeriesLaunchStage;
  stepLabel: string;
  progress: number;
  message: string;
  error?: string;
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
  error?: string;
};

export type GetDirSummaryResponse = Result<DirSummary[]>;

export type FileInfo = {
  name: string;
  sizeBytes: number;
  isDirectory: boolean;
  lastModified: number;
};

export type ReadDirResponse = Result<FileInfo[]>;

export type AssetInfo = {
  id: string;
  name: string;
  type: string;
  sizeBytes: number;
  fileName: string;
  targetDir: LibraryDirKey;
  description?: string;
  checksum?: string;
  downloadUrl?: string;
};

export type GetAssetListResponse = Result<AssetInfo[]>;

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'canceled';

export type AssetDownloadProgress = {
  downloadId: string;
  assetId: string;
  status: DownloadStatus;
  progress: number;
  downloadedBytes: number;
  totalBytes?: number;
  error?: string;
};

export type MediaDownloadFormat = 'mp4' | 'mp3';

export type MediaDownloadStatus =
  | 'pending'
  | 'validating'
  | 'running'
  | 'postprocessing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type StartMediaDownloadRequest = {
  seriesId: TerminalSeriesId;
  url: string;
  format: MediaDownloadFormat;
  outputDir?: string;
};

export type MediaDownloadProgress = {
  jobId: string;
  status: MediaDownloadStatus;
  percent?: number;
  downloadedText?: string;
  totalText?: string;
  speedText?: string;
  etaText?: string;
  message?: string;
  error?: string;
};
