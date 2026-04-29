import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { IPC_CHANNELS } from '@shared/ipc';
import { createLogger } from '@shared/logger';
import { SelectInstallPathResponse, SetSeriesOptionRequest, SetSeriesOptionResponse, TerminalSeriesId, DirSummary, GetDirSummaryResponse, LibraryDirKey, GetAssetListResponse } from '@shared/launcherTypes';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';

const logger = createLogger('launcher-handler');

export const registerLauncherHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.launcher.getSettings, async () => {
    try {
      const config = await launcherConfigRepo.getConfig();
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
      const config = await launcherConfigRepo.getConfig();
      const installPath = config.series[payload.seriesId].installPath;
      if (!installPath) {
        return { ok: true, data: [] }; // No install path set yet
      }

      // We should ideally read the SERIES_FEATURE_CONFIG to know which dirs to check.
      // For scaffolding, we can just return mocked dirs based on seriesId, or read actual folders.
      const dirsToCheck: LibraryDirKey[] = payload.seriesId === 'gascii' 
        ? ['video', 'audio'] 
        : ['music', 'glb', 'camera', 'stage', 'vmd', 'pmx'];

      const summaries: DirSummary[] = [];

      for (const dirKey of dirsToCheck) {
        const fullPath = path.join(installPath, dirKey);
        let exists = false;
        let fileCount = 0;
        let sizeBytes = 0;

        try {
          const stats = await fs.stat(fullPath);
          if (stats.isDirectory()) {
            exists = true;
            const files = await fs.readdir(fullPath);
            fileCount = files.length;
            // Simplified size calc: just count files for now, or stat each file
          }
        } catch {
          // directory does not exist
        }

        summaries.push({
          dirKey,
          exists,
          fileCount,
          sizeBytes,
        });
      }

      return { ok: true, data: summaries };
    } catch (error: any) {
      logger.error('getDirSummary failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.openLibraryDir, async (_event, payload: { seriesId: TerminalSeriesId; dir: string }) => {
    try {
      logger.info(`openLibraryDir: ${payload.seriesId} -> ${payload.dir}`);
      const config = await launcherConfigRepo.getConfig();
      const installPath = config.series[payload.seriesId].installPath;
      if (!installPath) return { ok: false, error: 'Install path not set' };

      const fullPath = path.join(installPath, payload.dir);
      
      // Ensure the directory exists before trying to open it
      try {
        await fs.access(fullPath);
      } catch {
        await fs.mkdir(fullPath, { recursive: true });
      }

      const error = await shell.openPath(fullPath);
      if (error) {
        return { ok: false, error };
      }
      return { ok: true, data: null };
    } catch (error: any) {
      logger.error('openLibraryDir failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.getAssetList, async (_event, payload: { seriesId: TerminalSeriesId }): Promise<GetAssetListResponse> => {
    try {
      if (payload.seriesId === 'mienjine') {
        return {
          ok: true,
          data: [
            { id: 'stage-default', name: 'Default Anime Stage.glb', type: 'Environment', sizeBytes: 12400000 },
            { id: 'model-base', name: 'Standard Character Base.pmx', type: 'Model', sizeBytes: 4200000 },
            { id: 'music-bgm', name: 'Sample Background Track.mp3', type: 'Music', sizeBytes: 3100000 },
            { id: 'anim-cam', name: 'Dynamic Camera Pan.vmd', type: 'Animation', sizeBytes: 150000 },
          ]
        };
      }
      return { ok: true, data: [] };
    } catch (error: any) {
      logger.error('getAssetList failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.downloadAsset, async (_event, payload: { assetId: string }) => {
    logger.info(`downloadAsset: ${payload.assetId}`);
    // Scaffold: will initiate download logic and emit onDownloadProgress
  });
};
