import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IPC_CHANNELS } from '@shared/ipc';
import { createLogger } from '@shared/logger';
import { SelectInstallPathResponse, SetSeriesOptionRequest, SetSeriesOptionResponse, TerminalSeriesId, DirSummary, GetDirSummaryResponse, LibraryDirKey, GetAssetListResponse } from '@shared/launcherTypes';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';
import { handleDownloadYoutube, cancelYoutubeDownload } from '../downloader/youtubeDownloader';
import { gasciiSeriesService } from '../services/gascii-series.service';

const logger = createLogger('launcher-handler');

const activeDownloads = new Map<string, AbortController>();

const getLibraryInstallPath = async (seriesId: TerminalSeriesId): Promise<string> => {
  if (seriesId === 'gascii') {
    const gasciiInfo = await launcherConfigRepo.getGasciiInstallInfo();
    if (gasciiInfo?.installPath) {
      return gasciiInfo.installPath;
    }
  }

  const config = await launcherConfigRepo.getConfig();
  return config.series[seriesId].installPath;
};

export const registerLauncherHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.launcher.getSettings, async () => {
    try {
      const config = await launcherConfigRepo.getConfig();
      const gasciiInfo = await launcherConfigRepo.getGasciiInstallInfo();
      if (gasciiInfo?.installPath) {
        config.series.gascii.installPath = gasciiInfo.installPath;
      }
      return { ok: true, data: config };
    } catch (error: any) {
      logger.error('getSettings failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.selectInstallPath, async (): Promise<SelectInstallPathResponse> => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      const options: Electron.OpenDialogOptions = { properties: ['openDirectory'] };
      const result = win 
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options);

      if (result.canceled || result.filePaths.length === 0) {
        return { ok: false, error: 'User canceled' };
      }

      return {
        ok: true,
        data: { path: result.filePaths[0] }
      };
    } catch (error: any) {
      logger.error('selectInstallPath failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.setInstallPath, async (_event, payload: { seriesId: TerminalSeriesId; path: string }) => {
    try {
      if (payload.seriesId === 'gascii') {
        const gasciiInfo = await launcherConfigRepo.getGasciiInstallInfo();
        try {
          await gasciiSeriesService.bindInstallPath(payload.path);
        } catch (error) {
          if (gasciiInfo) {
            throw new Error('선택한 폴더에서 Gascii 실행 파일을 찾을 수 없습니다.');
          }
        }
      }

      const config = await launcherConfigRepo.getConfig();
      config.series[payload.seriesId].installPath = payload.path;
      await launcherConfigRepo.saveConfig(config);
      return { ok: true, data: payload };
    } catch (error: any) {
      logger.error('setInstallPath failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.setSeriesOption, async (_event, request: SetSeriesOptionRequest): Promise<SetSeriesOptionResponse> => {
    try {
      const config = await launcherConfigRepo.getConfig();
      config.series[request.seriesId].options[request.key] = request.value;
      await launcherConfigRepo.saveConfig(config);

      logger.info(`setSeriesOption: [${request.seriesId}] ${request.key} = ${request.value}`);
      return {
        ok: true,
        data: request,
      };
    } catch (error: any) {
      logger.error('setSeriesOption failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.setGlobalOption, async (_event, payload: { key: string; value: any }) => {
    try {
      const config = await launcherConfigRepo.getConfig();
      (config.global as any)[payload.key] = payload.value;
      await launcherConfigRepo.saveConfig(config);
      return { ok: true, data: payload };
    } catch (error: any) {
      logger.error('setGlobalOption failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.getDirSummary, async (_event, payload: { seriesId: TerminalSeriesId }): Promise<GetDirSummaryResponse> => {
    try {
      const installPath = await getLibraryInstallPath(payload.seriesId);
      if (!installPath) {
        return { ok: true, data: [] }; // No install path set yet
      }

      const dirsToCheck: LibraryDirKey[] = payload.seriesId === 'gascii'
        ? ['video', 'audio'] 
        : ['music', 'glb', 'camera', 'stage', 'vmd', 'pmx'];

      const summaries: DirSummary[] = [];

      for (const dirKey of dirsToCheck) {
        const fullPath = payload.seriesId === 'gascii'
          ? path.join(installPath, 'assets', dirKey)
          : path.join(installPath, dirKey);
        let exists = false;
        let fileCount = 0;
        let sizeBytes = 0;
        let error: string | undefined;

        try {
          const stats = await fs.stat(fullPath);
          if (stats.isDirectory()) {
            exists = true;
            const files = await fs.readdir(fullPath);
            fileCount = files.length;
          }
        } catch (e: any) {
          if (e.code !== 'ENOENT') {
            error = e.message;
          }
        }

        summaries.push({
          dirKey,
          exists,
          fileCount,
          sizeBytes,
          error,
        });
      }

      return { ok: true, data: summaries };
    } catch (error: any) {
      logger.error('getDirSummary failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.openLibraryDir, async (event, payload: { seriesId: TerminalSeriesId; dir: string }) => {
    try {
      logger.info(`openLibraryDir: ${payload.seriesId} -> ${payload.dir}`);
      const installPath = await getLibraryInstallPath(payload.seriesId);
      if (!installPath) return { ok: false, error: 'Install path not set' };

      const fullPath = payload.seriesId === 'gascii'
        ? path.join(installPath, 'assets', payload.dir)
        : path.join(installPath, payload.dir);
      
      const relative = path.relative(installPath, fullPath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return { ok: false, error: 'Invalid directory path' };
      }
      
      try {
        await fs.access(fullPath);
      } catch {
        await fs.mkdir(fullPath, { recursive: true });
      }

      if (payload.seriesId === 'gascii' && (payload.dir === 'video' || payload.dir === 'audio')) {
        const win = BrowserWindow.fromWebContents(event.sender);
        const filters = payload.dir === 'video'
          ? [{ name: 'Video Files', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi'] }]
          : [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'] }];
        const result = win
          ? await dialog.showOpenDialog(win, {
              title: payload.dir === 'video' ? 'Add Gascii video files' : 'Add Gascii audio files',
              properties: ['openFile', 'multiSelections'],
              filters,
            })
          : await dialog.showOpenDialog({
              title: payload.dir === 'video' ? 'Add Gascii video files' : 'Add Gascii audio files',
              properties: ['openFile', 'multiSelections'],
              filters,
            });

        if (result.canceled || result.filePaths.length === 0) {
          return { ok: true, data: { path: fullPath, copiedCount: 0 } };
        }

        for (const filePath of result.filePaths) {
          await fs.copyFile(filePath, path.join(fullPath, path.basename(filePath)));
        }

        return { ok: true, data: { path: fullPath, copiedCount: result.filePaths.length } };
      }

      const error = await shell.openPath(fullPath);
      if (error) {
        return { ok: false, error };
      }
      return { ok: true, data: { path: fullPath, copiedCount: 0 } };
    } catch (error: any) {
      logger.error('openLibraryDir failed', error);
      return { ok: false, error: error.message };
    }
  });

const dummyUrl = 'https://raw.githubusercontent.com/ummsehun/launcher/main/package.json';
const MIENJINE_ASSETS: import('@shared/launcherTypes').AssetInfo[] = [
  { id: 'stage-default', name: 'Default Anime Stage.glb', type: 'Environment', sizeBytes: 12400000, fileName: 'Default Anime Stage.glb', targetDir: 'stage', downloadUrl: dummyUrl },
  { id: 'model-base', name: 'Standard Character Base.pmx', type: 'Model', sizeBytes: 4200000, fileName: 'Standard Character Base.pmx', targetDir: 'pmx', downloadUrl: dummyUrl },
  { id: 'music-bgm', name: 'Sample Background Track.mp3', type: 'Music', sizeBytes: 3100000, fileName: 'Sample Background Track.mp3', targetDir: 'music', downloadUrl: dummyUrl },
  { id: 'anim-cam', name: 'Dynamic Camera Pan.vmd', type: 'Animation', sizeBytes: 150000, fileName: 'Dynamic Camera Pan.vmd', targetDir: 'vmd', downloadUrl: dummyUrl },
];

function getAssetsForSeries(seriesId: TerminalSeriesId) {
  if (seriesId === 'mienjine') return MIENJINE_ASSETS;
  return [];
}

  ipcMain.handle(IPC_CHANNELS.launcher.getAssetList, async (_event, payload: { seriesId: TerminalSeriesId }): Promise<GetAssetListResponse> => {
    try {
      return { ok: true, data: getAssetsForSeries(payload.seriesId) };
    } catch (error: any) {
      logger.error('getAssetList failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.downloadAsset, async (event, payload: { seriesId: TerminalSeriesId; assetId: string }) => {
    logger.info(`downloadAsset: ${payload.assetId}`);
    
    const asset = getAssetsForSeries(payload.seriesId).find(a => a.id === payload.assetId);
    if (!asset || !asset.downloadUrl) return { ok: false, error: 'Asset not found or no URL' };

    const config = await launcherConfigRepo.getConfig();
    const installPath = config.series[payload.seriesId]?.installPath;
    if (!installPath) return { ok: false, error: 'Install path not set' };

    const targetDirFullPath = path.join(installPath, asset.targetDir);
    const targetFilePath = path.join(targetDirFullPath, asset.fileName);
    const tmpFilePath = `${targetFilePath}.tmp`;

    // Ensure target dir exists
    await fs.mkdir(targetDirFullPath, { recursive: true }).catch(() => {});

    const downloadId = `dl_${Date.now()}`;
    const controller = new AbortController();
    activeDownloads.set(downloadId, controller);

    // Run download asynchronously without blocking the IPC handle
    (async () => {
      let fileStream: import('fs').WriteStream | null = null;
      try {
        const response = await fetch(asset.downloadUrl!, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error('No body');

        // We use Node.js fetch which returns a Web ReadableStream
        const reader = response.body.getReader();
        const totalBytes = Number(response.headers.get('content-length')) || asset.sizeBytes;
        let downloadedBytes = 0;
        let lastReportTime = 0;

        fileStream = createWriteStream(tmpFilePath);

        event.sender.send(IPC_CHANNELS.launcher.onDownloadProgress, {
          downloadId, assetId: payload.assetId, status: 'downloading', progress: 0, downloadedBytes, totalBytes
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value) {
            fileStream.write(value);
            downloadedBytes += value.length;

            const now = Date.now();
            if (now - lastReportTime > 200) { // report every 200ms
              const progress = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
              event.sender.send(IPC_CHANNELS.launcher.onDownloadProgress, {
                downloadId, assetId: payload.assetId, status: 'downloading', progress, downloadedBytes, totalBytes
              });
              lastReportTime = now;
            }
          }
        }

        fileStream.end();
        fileStream = null;

        // Optionally, checksum validation here...

        await fs.rename(tmpFilePath, targetFilePath);
        
        event.sender.send(IPC_CHANNELS.launcher.onDownloadProgress, {
          downloadId, assetId: payload.assetId, status: 'completed', progress: 100, downloadedBytes, totalBytes
        });
      } catch (err: any) {
        if (fileStream) fileStream.end();
        await fs.unlink(tmpFilePath).catch(() => {});
        
        const status = err.name === 'AbortError' ? 'canceled' : 'failed';
        event.sender.send(IPC_CHANNELS.launcher.onDownloadProgress, {
          downloadId, assetId: payload.assetId, status, progress: 0, downloadedBytes: 0, error: err.message
        });
      } finally {
        activeDownloads.delete(downloadId);
      }
    })();

    return { ok: true, data: { downloadId } };
  });

  ipcMain.handle(IPC_CHANNELS.launcher.cancelDownload, async (_event, payload: { downloadId: string }) => {
    logger.info(`cancelDownload: ${payload.downloadId}`);
    const controller = activeDownloads.get(payload.downloadId);
    if (controller) {
      controller.abort();
      activeDownloads.delete(payload.downloadId);
      return { ok: true, data: null };
    }
    
    // Check youtube downloads as well
    if (await cancelYoutubeDownload(payload.downloadId)) {
      return { ok: true, data: null };
    }
    
    return { ok: true, data: null };
  });

  ipcMain.handle(IPC_CHANNELS.launcher.downloadYoutube, async (event, payload: import('@shared/launcherTypes').DownloadYoutubeRequest) => {
    return handleDownloadYoutube(event, payload);
  });
};
