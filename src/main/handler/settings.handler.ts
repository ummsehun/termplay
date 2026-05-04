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
import { assertManagedInstallPath } from '../security/installPathPolicy';
import { gasciiSeriesService } from '../services/gascii-series.service';
import { mienjineSeriesService } from '../services/mienjine-series.service';

const logger = createLogger('settings-handler');

export const registerSettingsHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.launcher.getSettings, async () => {
    try {
      const config = await launcherConfigRepo.getConfig();
      const gasciiInfo = await launcherConfigRepo.getGasciiInstallInfo();
      const mienjineInfo = await launcherConfigRepo.getMienjineInstallInfo();
      if (gasciiInfo?.installPath) {
        config.series.gascii.installPath = gasciiInfo.installPath;
      }
      if (mienjineInfo?.installPath) {
        config.series.mienjine.installPath = mienjineInfo.installPath;
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
      let installPath = await assertManagedInstallPath(request.seriesId, request.path);

      if (request.seriesId === 'gascii') {
        try {
          const gasciiInfo = await gasciiSeriesService.bindInstallPath(request.path);
          installPath = gasciiInfo.installPath;
        } catch {
          // Managed empty install destinations are allowed; existing installs are bound when valid.
        }
      }

      if (request.seriesId === 'mienjine') {
        try {
          const mienjineInfo = await mienjineSeriesService.bindInstallPath(request.path);
          installPath = mienjineInfo.installPath;
        } catch {
          // Managed empty install destinations are allowed; existing installs are bound when valid.
        }
      }

      const config = await launcherConfigRepo.getConfig();
      config.series[request.seriesId].installPath = installPath;
      await launcherConfigRepo.saveConfig(config);
      return { ok: true, data: { ...request, path: installPath } };
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
