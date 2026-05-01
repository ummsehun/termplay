import type { GameId, GameStatus } from '@shared/games';
import type {
  GasciiInstallInfo,
  LauncherSettingKey,
  LibraryDirKey,
  GlobalSettingKey,
  GlobalSettingValue,
  Result,
  SelectInstallPathResponse,
  SeriesInstallProgress,
  SeriesLaunchProgress,
  SeriesStatusInfo,
  SeriesVerifyResult,
  SetSeriesOptionResponse,
  StartMediaDownloadRequest,
  MediaDownloadProgress,
  TerminalSeriesId,
} from '@shared/launcherTypes';

type LaunchResult =
  | {
      ok: true;
      gameId: GameId;
      command: string;
      terminal: string;
      runId: string;
    }
  | {
      ok: false;
      error: string;
    };

declare global {
  interface Window {
    launcher: {
      game: {
        launch: (gameId: GameId) => Promise<LaunchResult>;
        onStatusChanged: (
          callback: (event: { gameId: GameId; status: GameStatus; message: string }) => void,
        ) => () => void;
      };
      settings: {
        get: () => Promise<Result<import('@shared/launcherTypes').LauncherConfig>>;
        selectInstallPath: () => Promise<SelectInstallPathResponse>;
        setInstallPath: (seriesId: TerminalSeriesId, path: string) => Promise<Result<{ seriesId: TerminalSeriesId; path: string }>>;
        setGlobalOption: <K extends GlobalSettingKey>(key: K, value: GlobalSettingValue<K>) => Promise<Result<{ key: K; value: GlobalSettingValue<K> }>>;
        setSeriesOption: (seriesId: TerminalSeriesId, key: LauncherSettingKey, value: boolean) => Promise<SetSeriesOptionResponse>;
      };
      library: {
        getDirSummary: (seriesId: TerminalSeriesId) => Promise<import('@shared/launcherTypes').GetDirSummaryResponse>;
        readDir: (seriesId: TerminalSeriesId, dir: LibraryDirKey) => Promise<import('@shared/launcherTypes').ReadDirResponse>;
        openDir: (seriesId: TerminalSeriesId, dir: LibraryDirKey) => Promise<Result<{ path: string; copiedCount: number }>>;
      };
      assets: {
        list: (seriesId: TerminalSeriesId) => Promise<import('@shared/launcherTypes').GetAssetListResponse>;
        download: (seriesId: TerminalSeriesId, assetId: string) => Promise<Result<{ downloadId: string }>>;
        cancel: (downloadId: string) => Promise<Result<null>>;
        onProgress: (callback: (event: import('@shared/launcherTypes').AssetDownloadProgress) => void) => () => void;
      };
      mediaDownload: {
        start: (request: StartMediaDownloadRequest) => Promise<Result<{ jobId: string }>>;
        cancel: (jobId: string) => Promise<Result<null>>;
        onProgress: (callback: (event: MediaDownloadProgress) => void) => () => void;
      };
      series: {
        getStatus: (seriesId: TerminalSeriesId) => Promise<Result<SeriesStatusInfo>>;
        install: (seriesId: TerminalSeriesId) => Promise<Result<GasciiInstallInfo>>;
        launch: (seriesId: TerminalSeriesId) => Promise<Result<{ terminal: string; binaryPath: string }>>;
        verify: (seriesId: TerminalSeriesId) => Promise<Result<SeriesVerifyResult>>;
        remove: (seriesId: TerminalSeriesId) => Promise<Result<null>>;
        revealInstallDir: (seriesId: TerminalSeriesId) => Promise<Result<{ path: string }>>;
        onInstallProgress: (callback: (event: SeriesInstallProgress) => void) => () => void;
        onLaunchProgress: (callback: (event: SeriesLaunchProgress) => void) => () => void;
      };
      navigation: {
        openExternal: (url: string) => Promise<Result<null>>;
      };
    };
  }
}

export {};
