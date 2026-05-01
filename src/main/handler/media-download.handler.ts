import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc';
import { type StartMediaDownloadRequest } from '@shared/launcherTypes';
import { mediaDownloadService } from '../downloader/mediaDownloadService';

export const registerMediaDownloadHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.mediaDownload.start, async (event, request: StartMediaDownloadRequest) => {
    try {
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

  ipcMain.handle(IPC_CHANNELS.mediaDownload.cancel, async (_event, jobId: string) => {
    try {
      await mediaDownloadService.cancel(jobId);
      return { ok: true, data: null };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });
};
