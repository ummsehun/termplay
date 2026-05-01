import { BrowserWindow, ipcMain, shell } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc';
import { type SeriesInstallProgress, type SeriesLaunchProgress, type TerminalSeriesId } from '@shared/launcherTypes';
import { seriesRequestSchema } from '@shared/launcherSchemas';
import { createLogger } from '@shared/logger';
import { createSplashWindow, waitForSplashWindowReady } from '../core/create-splash-window';
import { gasciiSeriesService } from '../services/gascii-series.service';
import { toErrorMessage } from '../utils/error';

const logger = createLogger('series-handler');

const assertGascii = (seriesId: TerminalSeriesId): void => {
  if (seriesId !== 'gascii') {
    throw new Error(`${seriesId} is still using mock lifecycle`);
  }
};

export const registerSeriesHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.series.getStatus, async (_event, payload: unknown) => {
    const parsed = seriesRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      assertGascii(parsed.data.seriesId);
      return {
        ok: true,
        data: await gasciiSeriesService.getStatus(),
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
      assertGascii(seriesId);
      const info = await gasciiSeriesService.install(sendProgress);
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
    let splashWindow: BrowserWindow | null = null;

    const sendProgress = (progress: SeriesLaunchProgress): void => {
      event.sender.send(IPC_CHANNELS.series.launchProgress, progress);
      splashWindow?.webContents.send(IPC_CHANNELS.series.launchProgress, progress);
    };

    try {
      assertGascii(seriesId);
      splashWindow = createSplashWindow();
      await waitForSplashWindowReady(splashWindow);
      const result = await gasciiSeriesService.launch(sendProgress);
      const windowToClose = splashWindow;
      setTimeout(() => {
        if (!windowToClose.isDestroyed()) {
          windowToClose.close();
        }
      }, 650);

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
      assertGascii(parsed.data.seriesId);
      return {
        ok: true,
        data: await gasciiSeriesService.verify(),
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
      assertGascii(parsed.data.seriesId);
      await gasciiSeriesService.remove();
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
      assertGascii(parsed.data.seriesId);
      const status = await gasciiSeriesService.getStatus();
      if (!status.installPath) {
        throw new Error('Gascii is not installed');
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
