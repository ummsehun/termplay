import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { type MediaDownloadProgress, type StartMediaDownloadRequest } from '@shared/launcherTypes';
import { createLogger } from '@shared/logger';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';
import { BinaryResolver } from './binaryResolver';
import { InputValidator } from './inputValidator';
import { ArgumentBuilder, type NormalizedDownloadInput } from './argumentBuilder';
import { ProcessRunner } from './processRunner';

const logger = createLogger('media-download-service');

type StartMediaDownloadOptions = {
  sendProgress: (progress: MediaDownloadProgress) => void;
};

export class MediaDownloadService {
  private readonly runningJobs = new Map<string, { runner: ProcessRunner; sendProgress: (progress: MediaDownloadProgress) => void }>();

  async start(request: StartMediaDownloadRequest, options: StartMediaDownloadOptions): Promise<{ jobId: string }> {
    const jobId = `media_${randomUUID()}`;
    const sendProgress = (progress: Omit<MediaDownloadProgress, 'jobId'>) => {
      options.sendProgress({ jobId, ...progress });
    };

    sendProgress({
      status: 'validating',
      percent: 0,
      message: 'Validating media download request',
    });

    try {
      InputValidator.validateFormat(request.format);
      InputValidator.validateUrl(request.url);

      const outputDir = await this.resolveOutputDir(request);
      await fs.mkdir(outputDir, { recursive: true });

      const ytDlpVersion = await BinaryResolver.checkYtDlpVersion();
      logger.info('yt-dlp health check passed', { ytDlpVersion });

      const ffmpegPath = BinaryResolver.ffmpegPath;
      if (request.format === 'mp3') {
        const ffmpegVersion = await BinaryResolver.checkFfmpegAvailable();
        logger.info('ffmpeg health check passed', { ffmpegVersion });
      }

      const normalizedInput: NormalizedDownloadInput = {
        url: request.url,
        format: request.format,
        outputDir,
        ffmpegPath,
      };
      const args = ArgumentBuilder.build(normalizedInput);
      const runner = new ProcessRunner({
        jobId,
        binPath: BinaryResolver.ytDlpPath,
        args,
        outputDir,
        onProgress: options.sendProgress,
      });

      this.runningJobs.set(jobId, { runner, sendProgress: options.sendProgress });
      sendProgress({
        status: 'running',
        percent: 0,
        message: request.format === 'mp3' ? 'Downloading audio source' : 'Downloading video',
      });

      runner.run()
        .then(() => {
          options.sendProgress({
            jobId,
            status: 'completed',
            percent: 100,
            message: 'Media download completed',
          });
        })
        .catch((error) => {
          const isCancelled = error instanceof Error && error.message === 'CANCELLED';
          options.sendProgress({
            jobId,
            status: isCancelled ? 'cancelled' : 'failed',
            percent: isCancelled ? undefined : 0,
            message: isCancelled ? 'Media download cancelled' : 'Media download failed',
            error: isCancelled ? undefined : error instanceof Error ? error.message : String(error),
          });
        })
        .finally(() => {
          this.runningJobs.delete(jobId);
        });

      return { jobId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendProgress({
        status: 'failed',
        percent: 0,
        message: 'Media download setup failed',
        error: message,
      });
      throw error;
    }
  }

  async cancel(jobId: string): Promise<void> {
    const job = this.runningJobs.get(jobId);
    if (!job) {
      return;
    }

    job.sendProgress({
      jobId,
      status: 'cancelled',
      message: 'Media download cancellation requested',
    });
    await job.runner.cancel();
  }

  private async resolveOutputDir(request: StartMediaDownloadRequest): Promise<string> {
    const config = await launcherConfigRepo.getConfig();
    const gasciiInfo = request.seriesId === 'gascii' ? await launcherConfigRepo.getGasciiInstallInfo() : null;
    const installPath = gasciiInfo?.installPath ?? config.series[request.seriesId]?.installPath;

    if (!installPath) {
      throw new Error('Install path not set');
    }

    const allowedRoot = request.seriesId === 'gascii'
      ? path.resolve(installPath, 'assets')
      : path.resolve(installPath);

    if (request.outputDir) {
      return InputValidator.validateOutputDir(allowedRoot, request.outputDir);
    }

    return InputValidator.validateOutputRoot(allowedRoot, request.format === 'mp4' ? 'video' : 'audio');
  }
}

export const mediaDownloadService = new MediaDownloadService();
