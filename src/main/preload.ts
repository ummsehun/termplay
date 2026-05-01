import { contextBridge, ipcRenderer } from 'electron';
import { type GameId } from '@shared/games';
import { IPC_CHANNELS } from '@shared/ipc';
import type {
  TerminalSeriesId,
  LauncherSettingKey,
  LibraryDirKey,
  GlobalSettingKey,
  GlobalSettingValue,
} from '@shared/launcherTypes';

contextBridge.exposeInMainWorld('launcher', {
  game: {
    launch: (gameId: GameId) => ipcRenderer.invoke(IPC_CHANNELS.launchGame, gameId),
    onStatusChanged: (callback: (event: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.gameStatusChanged, listener);
      return () => {
        ipcRenderer.off(IPC_CHANNELS.gameStatusChanged, listener);
      };
    },
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.launcher.getSettings),
    selectInstallPath: () => ipcRenderer.invoke(IPC_CHANNELS.launcher.selectInstallPath),
    setInstallPath: (seriesId: TerminalSeriesId, path: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.launcher.setInstallPath, { seriesId, path }),
    setGlobalOption: <K extends GlobalSettingKey>(key: K, value: GlobalSettingValue<K>) =>
      ipcRenderer.invoke(IPC_CHANNELS.launcher.setGlobalOption, { key, value }),
    setSeriesOption: (seriesId: TerminalSeriesId, key: LauncherSettingKey, value: boolean) => 
      ipcRenderer.invoke(IPC_CHANNELS.launcher.setSeriesOption, { seriesId, key, value }),
  },
  library: {
    getDirSummary: (seriesId: TerminalSeriesId) => ipcRenderer.invoke(IPC_CHANNELS.launcher.getDirSummary, { seriesId }),
    readDir: (seriesId: TerminalSeriesId, dir: LibraryDirKey) => ipcRenderer.invoke(IPC_CHANNELS.launcher.readLibraryDir, { seriesId, dir }),
    openDir: (seriesId: TerminalSeriesId, dir: LibraryDirKey) => ipcRenderer.invoke(IPC_CHANNELS.launcher.openLibraryDir, { seriesId, dir }),
  },
  assets: {
    list: (seriesId: TerminalSeriesId) => ipcRenderer.invoke(IPC_CHANNELS.launcher.getAssetList, { seriesId }),
    download: (seriesId: TerminalSeriesId, assetId: string) => ipcRenderer.invoke(IPC_CHANNELS.launcher.downloadAsset, { seriesId, assetId }),
    cancel: (downloadId: string) => ipcRenderer.invoke(IPC_CHANNELS.launcher.cancelDownload, { downloadId }),
    onProgress: (callback: (event: any) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: any) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.launcher.onDownloadProgress, listener);
      return () => {
        ipcRenderer.off(IPC_CHANNELS.launcher.onDownloadProgress, listener);
      };
    }
  },
  mediaDownload: {
    start: (request: import('@shared/launcherTypes').StartMediaDownloadRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.mediaDownload.start, request),
    cancel: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.mediaDownload.cancel, jobId),
    onProgress: (callback: (event: import('@shared/launcherTypes').MediaDownloadProgress) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: import('@shared/launcherTypes').MediaDownloadProgress) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.mediaDownload.progress, listener);
      return () => {
        ipcRenderer.off(IPC_CHANNELS.mediaDownload.progress, listener);
      };
    },
  },
  navigation: {
    openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.navigation.openExternal, { url }),
  },
  series: {
    getStatus: (seriesId: TerminalSeriesId) => ipcRenderer.invoke(IPC_CHANNELS.series.getStatus, { seriesId }),
    install: (seriesId: TerminalSeriesId) => ipcRenderer.invoke(IPC_CHANNELS.series.install, { seriesId }),
    launch: (seriesId: TerminalSeriesId) => ipcRenderer.invoke(IPC_CHANNELS.series.launch, { seriesId }),
    verify: (seriesId: TerminalSeriesId) => ipcRenderer.invoke(IPC_CHANNELS.series.verify, { seriesId }),
    remove: (seriesId: TerminalSeriesId) => ipcRenderer.invoke(IPC_CHANNELS.series.remove, { seriesId }),
    revealInstallDir: (seriesId: TerminalSeriesId) => ipcRenderer.invoke(IPC_CHANNELS.series.revealInstallDir, { seriesId }),
    onInstallProgress: (callback: (event: any) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: any) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.series.installProgress, listener);
      return () => {
        ipcRenderer.off(IPC_CHANNELS.series.installProgress, listener);
      };
    },
    onLaunchProgress: (callback: (event: any) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: any) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.series.launchProgress, listener);
      return () => {
        ipcRenderer.off(IPC_CHANNELS.series.launchProgress, listener);
      };
    },
  }
});
