import path from 'path';
import { createLogger } from '@shared/logger';
import { DownloadYoutubeRequest } from '@shared/launcherTypes';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';
import { IPC_CHANNELS } from '@shared/ipc';
import { IpcMainInvokeEvent } from 'electron';
import { BinaryResolver } from './binaryResolver';
import { InputValidator } from './inputValidator';
import { ArgumentBuilder, NormalizedDownloadInput } from './argumentBuilder';
import { ProcessRunner } from './processRunner';

const logger = createLogger('youtube-downloader');

export const activeYoutubeDownloads = new Map<string, ProcessRunner>();

export async function handleDownloadYoutube(event: IpcMainInvokeEvent, request: DownloadYoutubeRequest) {
  logger.info(`Starting YouTube download: ${request.url} [${request.format}] for ${request.seriesId}`);

  try {
    // 7.2: Validation
    InputValidator.validateUrl(request.url);

    const config = await launcherConfigRepo.getConfig();
    const installPath = config.series[request.seriesId]?.installPath;
    
    if (!installPath) {
      throw new Error('Install path not set');
    }

    const targetDirName = request.format === 'mp4' ? 'video' : 'audio';
    const targetDirFullPath = InputValidator.validateOutputRoot(installPath, targetDirName);

    // 7.1: Binary Check
    await BinaryResolver.checkYtDlpVersion();
    const ffmpegPath = BinaryResolver.ffmpegPath;
    if (request.format === 'mp3') {
      await BinaryResolver.checkFfmpegAvailable();
    }

    // 7.3: Argument Build
    const normalizedInput: NormalizedDownloadInput = {
      url: request.url,
      format: request.format,
      outputDir: targetDirFullPath,
      ffmpegPath
    };
    const args = ArgumentBuilder.build(normalizedInput);

    const downloadId = `yt_${Date.now()}`;
    
    // 7.4 & 7.5: Process Runner
    const runner = new ProcessRunner({
      jobId: downloadId,
      binPath: BinaryResolver.ytDlpPath,
      args,
      outputDir: targetDirFullPath,
      onProgress: (progEvent) => {
        event.sender.send(IPC_CHANNELS.launcher.onDownloadProgress, {
          downloadId,
          assetId: request.url,
          status: 'downloading',
          progress: progEvent.percent ?? 0,
          downloadedBytes: 0, // yt-dlp percent parsing is used instead
        });
      }
    });

    activeYoutubeDownloads.set(downloadId, runner);

    // 7.6: Running & Handling result
    runner.run()
      .then(() => {
        event.sender.send(IPC_CHANNELS.launcher.onDownloadProgress, {
          downloadId,
          assetId: request.url,
          status: 'completed',
          progress: 100,
          downloadedBytes: 100
        });
      })
      .catch((err) => {
        if (err.message === 'CANCELLED') {
          event.sender.send(IPC_CHANNELS.launcher.onDownloadProgress, {
            downloadId,
            assetId: request.url,
            status: 'canceled',
            progress: 0,
            downloadedBytes: 0,
          });
        } else {
          logger.error('yt-dlp error', err);
          event.sender.send(IPC_CHANNELS.launcher.onDownloadProgress, {
            downloadId,
            assetId: request.url,
            status: 'failed',
            progress: 0,
            downloadedBytes: 0,
            error: err.message
          });
        }
      })
      .finally(() => {
        activeYoutubeDownloads.delete(downloadId);
      });

    return { ok: true, data: { downloadId } };
  } catch (error: any) {
    logger.error('Download setup failed', error);
    return { ok: false, error: error.message };
  }
}

export async function cancelYoutubeDownload(downloadId: string): Promise<boolean> {
  const runner = activeYoutubeDownloads.get(downloadId);
  if (runner) {
    await runner.cancel();
    return true;
  }
  return false;
}
