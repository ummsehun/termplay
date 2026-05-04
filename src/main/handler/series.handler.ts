import { randomUUID } from 'node:crypto';
import { BrowserWindow, ipcMain, shell } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc';
import { type SeriesInstallProgress, type SeriesLaunchProgress, type TerminalSeriesId } from '@shared/launcherTypes';
import { seriesRequestSchema } from '@shared/launcherSchemas';
import { createLogger } from '@shared/logger';
import { createSplashWindow, waitForSplashWindowReady } from '../core/create-splash-window';
import { gasciiSeriesService } from '../services/gascii-series.service';
import { mienjineSeriesService } from '../services/mienjine-series.service';
import { toErrorMessage } from '../utils/error';

const logger = createLogger('series-handler');

const closeWindowLater = (window: BrowserWindow | null, delayMs: number): void => {
  if (!window) {
    return;
  }

  setTimeout(() => {
    if (!window.isDestroyed()) {
      window.close();
    }
  }, delayMs);
};

const getSeriesService = (seriesId: TerminalSeriesId): typeof gasciiSeriesService | typeof mienjineSeriesService => {
  if (seriesId === 'gascii') {
    return gasciiSeriesService;
  }

  return mienjineSeriesService;
};

export const registerSeriesHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.series.getStatus, async (_event, payload: unknown) => {
    const parsed = seriesRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      return {
        ok: true,
        data: await getSeriesService(parsed.data.seriesId).getStatus(),
      };
    } catch (error) {
      logger.error('getStatus failed', error);
      return {
        ok: false,
        error: toErrorMessage(error),
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.series.install, async (event, payload: unknown) => {
    const parsed = seriesRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }
    const { seriesId } = parsed.data;
    const sendProgress = (progress: SeriesInstallProgress): void => {
      event.sender.send(IPC_CHANNELS.series.installProgress, progress);
    };

    try {
      const info = await getSeriesService(seriesId).install(sendProgress);
      return {
        ok: true,
        data: info,
      };
    } catch (error) {
      const message = toErrorMessage(error);
      logger.error('install failed', error);
      sendProgress({
        seriesId,
        stage: 'failed',
        progress: 100,
        message,
        error: message,
      });
      return {
        ok: false,
        error: message,
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.series.launch, async (event, payload: unknown) => {
    const parsed = seriesRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }
    const { seriesId } = parsed.data;
    const launchId = randomUUID();
    let splashWindow: BrowserWindow | null = null;

    const sendProgress = (progress: SeriesLaunchProgress): void => {
      const progressWithLaunchId = { ...progress, launchId };
      event.sender.send(IPC_CHANNELS.series.launchProgress, progressWithLaunchId);
      splashWindow?.webContents.send(IPC_CHANNELS.series.launchProgress, progressWithLaunchId);
    };

    try {
      splashWindow = createSplashWindow({ launchId, seriesId });
      await waitForSplashWindowReady(splashWindow);
      const result = await getSeriesService(seriesId).launch(sendProgress);
      closeWindowLater(splashWindow, 650);

      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      const message = toErrorMessage(error);
      logger.error('launch failed', error);
      sendProgress({
        seriesId,
        stage: 'failed',
        stepLabel: 'Launch failed',
        progress: 100,
        message,
        error: message,
      });
      closeWindowLater(splashWindow, 4500);
      return {
        ok: false,
        error: message,
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.series.verify, async (_event, payload: unknown) => {
    const parsed = seriesRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      return {
        ok: true,
        data: await getSeriesService(parsed.data.seriesId).verify(),
      };
    } catch (error) {
      logger.error('verify failed', error);
      return {
        ok: false,
        error: toErrorMessage(error),
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.series.remove, async (_event, payload: unknown) => {
    const parsed = seriesRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      await getSeriesService(parsed.data.seriesId).remove();
      return {
        ok: true,
        data: null,
      };
    } catch (error) {
      logger.error('remove failed', error);
      return {
        ok: false,
        error: toErrorMessage(error),
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.series.revealInstallDir, async (_event, payload: unknown) => {
    const parsed = seriesRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      const status = await getSeriesService(parsed.data.seriesId).getStatus();
      if (!status.installPath) {
        throw new Error(`${parsed.data.seriesId} is not installed`);
      }

      const error = await shell.openPath(status.installPath);
      if (error) {
        throw new Error(error);
      }

      return {
        ok: true,
        data: { path: status.installPath },
      };
    } catch (error) {
      logger.error('revealInstallDir failed', error);
      return {
        ok: false,
        error: toErrorMessage(error),
      };
    }
  });
};
