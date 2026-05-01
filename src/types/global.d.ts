import type { GameId, GameStatus } from '@shared/games';
import type {
  GasciiInstallInfo,
  LauncherSettingKey,
  Result,
  SelectInstallPathResponse,
  SeriesInstallProgress,
  SeriesLaunchProgress,
  SeriesStatusInfo,
  SetSeriesOptionResponse,
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
        setGlobalOption: (key: string, value: any) => Promise<Result<{ key: string; value: any }>>;
        setSeriesOption: (seriesId: TerminalSeriesId, key: LauncherSettingKey, value: boolean) => Promise<SetSeriesOptionResponse>;
      };
      library: {
        getDirSummary: (seriesId: TerminalSeriesId) => Promise<import('@shared/launcherTypes').GetDirSummaryResponse>;
        openDir: (seriesId: string, dir: string) => Promise<void>;
      };
      assets: {
        list: (seriesId: TerminalSeriesId) => Promise<import('@shared/launcherTypes').GetAssetListResponse>;
        download: (seriesId: TerminalSeriesId, assetId: string) => Promise<void>;
        downloadYoutube: (seriesId: TerminalSeriesId, url: string, format: 'mp4' | 'mp3') => Promise<import('@shared/launcherTypes').Result<{ downloadId: string }>>;
        cancel: (downloadId: string) => Promise<void>;
        onProgress: (callback: (event: import('@shared/launcherTypes').AssetDownloadProgress) => void) => () => void;
      };
      series: {
        getStatus: (seriesId: TerminalSeriesId) => Promise<Result<SeriesStatusInfo>>;
        install: (seriesId: TerminalSeriesId) => Promise<Result<GasciiInstallInfo>>;
        launch: (seriesId: TerminalSeriesId) => Promise<Result<{ terminal: string; binaryPath: string }>>;
        onInstallProgress: (callback: (event: SeriesInstallProgress) => void) => () => void;
        onLaunchProgress: (callback: (event: SeriesLaunchProgress) => void) => () => void;
      };
    };
  }
}

export {};
