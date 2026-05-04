import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import path from 'path';
import { IPC_CHANNELS } from '@shared/ipc';
import {
  type FileInfo,
  type ReadDirResponse,
  type DirSummary,
  type GetDirSummaryResponse,
  type LibraryDirKey,
  type TerminalSeriesId,
} from '@shared/launcherTypes';
import { libraryDirRequestSchema, seriesRequestSchema } from '@shared/launcherSchemas';
import { createLogger } from '@shared/logger';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';
import { InputValidator } from '../downloader/inputValidator';
import { assertManagedInstallPath } from '../security/installPathPolicy';
import { SERIES_DEFINITIONS } from '../services/series-definitions';

const logger = createLogger('library-handler');

const resolveUniqueFilePath = async (directoryPath: string, fileName: string): Promise<string> => {
  const parsed = path.parse(fileName);
  let candidate = path.join(directoryPath, fileName);
  let index = 1;

  while (true) {
    try {
      await fs.access(candidate);
      candidate = path.join(directoryPath, `${parsed.name}-${index}${parsed.ext}`);
      index += 1;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return candidate;
      }

      throw error;
    }
  }
};

const getLibraryInstallPath = async (seriesId: TerminalSeriesId): Promise<string> => {
  let installPath: string;

  if (seriesId === 'gascii') {
    const gasciiInfo = await launcherConfigRepo.getGasciiInstallInfo();
    if (gasciiInfo?.installPath) {
      installPath = gasciiInfo.installPath;
      return assertManagedInstallPath(seriesId, installPath);
    }
  }

  if (seriesId === 'mienjine') {
    const mienjineInfo = await launcherConfigRepo.getMienjineInstallInfo();
    if (mienjineInfo?.installPath) {
      installPath = mienjineInfo.installPath;
      return assertManagedInstallPath(seriesId, installPath);
    }
  }

  const config = await launcherConfigRepo.getConfig();
  installPath = config.series[seriesId].installPath;
  return installPath ? assertManagedInstallPath(seriesId, installPath) : '';
};

const getLibraryDirPath = (seriesId: TerminalSeriesId, installPath: string, dir: string): string => {
  return seriesId === 'gascii' || seriesId === 'mienjine'
    ? path.join(installPath, 'assets', dir)
    : path.join(installPath, dir);
};

export const registerLibraryHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.launcher.getDirSummary, async (_event, payload: unknown): Promise<GetDirSummaryResponse> => {
    const parsed = seriesRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      const { seriesId } = parsed.data;
      const installPath = await getLibraryInstallPath(seriesId);
      if (!installPath) {
        return { ok: true, data: [] };
      }

      const dirsToCheck: LibraryDirKey[] = seriesId === 'gascii'
        ? [...SERIES_DEFINITIONS.gascii.libraryDirs]
        : [...SERIES_DEFINITIONS.mienjine.libraryDirs];

      const summaries: DirSummary[] = [];

      for (const dirKey of dirsToCheck) {
        const fullPath = getLibraryDirPath(seriesId, installPath, dirKey);
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

        summaries.push({ dirKey, exists, fileCount, sizeBytes, error });
      }

      return { ok: true, data: summaries };
    } catch (error: any) {
      logger.error('getDirSummary failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.readLibraryDir, async (_event, payload: unknown): Promise<ReadDirResponse> => {
    const parsed = libraryDirRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      const { seriesId, dir } = parsed.data;
      const installPath = await getLibraryInstallPath(seriesId);
      if (!installPath) {
        return { ok: false, error: 'Install path not set' };
      }

      const fullPath = getLibraryDirPath(seriesId, installPath, dir);
      
      try {
        await fs.access(fullPath);
      } catch {
        return { ok: true, data: [] }; // Directory might not exist yet
      }
      await InputValidator.assertRealOutputDir(installPath, fullPath);

      const files = await fs.readdir(fullPath);
      const fileInfos: FileInfo[] = [];

      for (const file of files) {
        const filePath = path.join(fullPath, file);
        try {
          const stats = await fs.stat(filePath);
          fileInfos.push({
            name: file,
            sizeBytes: stats.size,
            isDirectory: stats.isDirectory(),
            lastModified: stats.mtimeMs,
          });
        } catch (e) {
          // Skip if we can't read stats
        }
      }

      return { ok: true, data: fileInfos.sort((a, b) => {
        // Directories first
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      }) };
    } catch (error: any) {
      logger.error('readLibraryDir failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.openLibraryDir, async (event, payload: unknown) => {
    const parsed = libraryDirRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      const { seriesId, dir } = parsed.data;
      logger.info(`openLibraryDir: ${seriesId} -> ${dir}`);
      const installPath = await getLibraryInstallPath(seriesId);
      if (!installPath) return { ok: false, error: 'Install path not set' };

      const fullPath = getLibraryDirPath(seriesId, installPath, dir);
      const relative = path.relative(installPath, fullPath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return { ok: false, error: 'Invalid directory path' };
      }

      await fs.mkdir(fullPath, { recursive: true });
      await InputValidator.assertRealOutputDir(installPath, fullPath);

      if (seriesId === 'gascii' && (dir === 'video' || dir === 'audio')) {
        const win = BrowserWindow.fromWebContents(event.sender);
        const filters = dir === 'video'
          ? [{ name: 'Video Files', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi'] }]
          : [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'] }];
        const result = win
          ? await dialog.showOpenDialog(win, {
              title: dir === 'video' ? 'Add Gascii video files' : 'Add Gascii audio files',
              properties: ['openFile', 'multiSelections'],
              filters,
            })
          : await dialog.showOpenDialog({
              title: dir === 'video' ? 'Add Gascii video files' : 'Add Gascii audio files',
              properties: ['openFile', 'multiSelections'],
              filters,
            });

        if (result.canceled || result.filePaths.length === 0) {
          return { ok: true, data: { path: fullPath, copiedCount: 0 } };
        }

        for (const filePath of result.filePaths) {
          const targetFilePath = await resolveUniqueFilePath(fullPath, path.basename(filePath));
          await InputValidator.assertRealOutputDir(fullPath, targetFilePath);
          await fs.copyFile(filePath, targetFilePath, fsConstants.COPYFILE_EXCL);
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
};
