import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc';
import { type StartMediaDownloadRequest } from '@shared/launcherTypes';
import { cancelMediaDownloadRequestSchema, startMediaDownloadRequestSchema } from '@shared/launcherSchemas';
import { mediaDownloadService } from '../downloader/mediaDownloadService';

export const registerMediaDownloadHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.mediaDownload.start, async (event, payload: unknown) => {
    const parsed = startMediaDownloadRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      const request: StartMediaDownloadRequest = parsed.data;
      const result = await mediaDownloadService.start(request, {
        sendProgress: (progress) => {
          event.sender.send(IPC_CHANNELS.mediaDownload.progress, progress);
        },
      });

      return { ok: true, data: result };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.mediaDownload.cancel, async (_event, payload: unknown) => {
    const parsed = cancelMediaDownloadRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      await mediaDownloadService.cancel(parsed.data);
      return { ok: true, data: null };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });
};
