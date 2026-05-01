import { BrowserWindow, dialog, ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc';
import {
  type SelectInstallPathResponse,
  type SetSeriesOptionRequest,
  type SetSeriesOptionResponse,
  type TerminalSeriesId,
} from '@shared/launcherTypes';
import {
  setGlobalOptionRequestSchema,
  setInstallPathRequestSchema,
  setSeriesOptionRequestSchema,
} from '@shared/launcherSchemas';
import { createLogger } from '@shared/logger';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';
import { gasciiSeriesService } from '../services/gascii-series.service';

const logger = createLogger('settings-handler');

export const registerSettingsHandlers = (): void => {
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

      return { ok: true, data: { path: result.filePaths[0] } };
    } catch (error: any) {
      logger.error('selectInstallPath failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.setInstallPath, async (_event, payload: unknown) => {
    const parsed = setInstallPathRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      const request = parsed.data;
      if (request.seriesId === 'gascii') {
        const gasciiInfo = await launcherConfigRepo.getGasciiInstallInfo();
        try {
          await gasciiSeriesService.bindInstallPath(request.path);
        } catch {
          if (gasciiInfo) {
            throw new Error('선택한 폴더에서 Gascii 실행 파일을 찾을 수 없습니다.');
          }
        }
      }

      const config = await launcherConfigRepo.getConfig();
      config.series[request.seriesId].installPath = request.path;
      await launcherConfigRepo.saveConfig(config);
      return { ok: true, data: request };
    } catch (error: any) {
      logger.error('setInstallPath failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.setSeriesOption, async (_event, payload: unknown): Promise<SetSeriesOptionResponse> => {
    const parsed = setSeriesOptionRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      const request: SetSeriesOptionRequest = parsed.data;
      const config = await launcherConfigRepo.getConfig();
      config.series[request.seriesId].options[request.key] = request.value;
      await launcherConfigRepo.saveConfig(config);

      logger.info(`setSeriesOption: [${request.seriesId}] ${request.key} = ${request.value}`);
      return { ok: true, data: request };
    } catch (error: any) {
      logger.error('setSeriesOption failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.setGlobalOption, async (_event, payload: unknown) => {
    const parsed = setGlobalOptionRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      const request = parsed.data;
      const config = await launcherConfigRepo.getConfig();
      if (request.key === 'language') {
        config.global.language = request.value;
      } else {
        config.global.autoUpdate = request.value;
      }
      await launcherConfigRepo.saveConfig(config);
      return { ok: true, data: request };
    } catch (error: any) {
      logger.error('setGlobalOption failed', error);
      return { ok: false, error: error.message };
    }
  });
};
