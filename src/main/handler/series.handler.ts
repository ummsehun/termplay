import { BrowserWindow, ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc';
import { type SeriesInstallProgress, type SeriesLaunchProgress, type TerminalSeriesId } from '@shared/launcherTypes';
import { createLogger } from '@shared/logger';
import { createSplashWindow } from '../core/create-splash-window';
import { gasciiSeriesService } from '../services/gascii-series.service';
import { toErrorMessage } from '../utils/error';

const logger = createLogger('series-handler');

const assertGascii = (seriesId: TerminalSeriesId): void => {
  if (seriesId !== 'gascii') {
    throw new Error(`${seriesId} is still using mock lifecycle`);
  }
};

export const registerSeriesHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.series.getStatus, async (_event, payload: { seriesId: TerminalSeriesId }) => {
    try {
      assertGascii(payload.seriesId);
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

  ipcMain.handle(IPC_CHANNELS.series.install, async (event, payload: { seriesId: TerminalSeriesId }) => {
    const sendProgress = (progress: SeriesInstallProgress): void => {
      event.sender.send(IPC_CHANNELS.series.installProgress, progress);
    };

    try {
      assertGascii(payload.seriesId);
      const info = await gasciiSeriesService.install(sendProgress);
      return {
        ok: true,
        data: info,
      };
    } catch (error) {
      const message = toErrorMessage(error);
      logger.error('install failed', error);
      sendProgress({
        seriesId: payload.seriesId,
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

  ipcMain.handle(IPC_CHANNELS.series.launch, async (event, payload: { seriesId: TerminalSeriesId }) => {
    let splashWindow: BrowserWindow | null = null;

    const sendProgress = (progress: SeriesLaunchProgress): void => {
      event.sender.send(IPC_CHANNELS.series.launchProgress, progress);
      splashWindow?.webContents.send(IPC_CHANNELS.series.launchProgress, progress);
    };

    try {
      assertGascii(payload.seriesId);
      splashWindow = createSplashWindow();
      await new Promise<void>((resolve) => {
        if (!splashWindow) {
          resolve();
          return;
        }

        if (!splashWindow.webContents.isLoading()) {
          resolve();
          return;
        }

        const finish = () => resolve();
        splashWindow.webContents.once('did-finish-load', finish);
        splashWindow.webContents.once('did-fail-load', finish);
      });
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
        seriesId: payload.seriesId,
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
};
