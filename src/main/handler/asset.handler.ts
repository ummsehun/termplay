import { ipcMain } from 'electron';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';
import { IPC_CHANNELS } from '@shared/ipc';
import { createLogger } from '@shared/logger';
import { type AssetInfo, type GetAssetListResponse, type TerminalSeriesId } from '@shared/launcherTypes';
import { assetRequestSchema, cancelDownloadRequestSchema, downloadAssetRequestSchema } from '@shared/launcherSchemas';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';
import { InputValidator } from '../downloader/inputValidator';

const logger = createLogger('asset-handler');

const activeDownloads = new Map<string, AbortController>();
const MAX_ASSET_DOWNLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const dummyUrl = 'https://raw.githubusercontent.com/ummsehun/launcher/main/package.json';
const MIENJINE_ASSETS: AssetInfo[] = [
  { id: 'stage-default', name: 'Default Anime Stage.glb', type: 'Environment', sizeBytes: 12400000, fileName: 'Default Anime Stage.glb', targetDir: 'stage', downloadUrl: dummyUrl },
  { id: 'model-base', name: 'Standard Character Base.pmx', type: 'Model', sizeBytes: 4200000, fileName: 'Standard Character Base.pmx', targetDir: 'pmx', downloadUrl: dummyUrl },
  { id: 'music-bgm', name: 'Sample Background Track.mp3', type: 'Music', sizeBytes: 3100000, fileName: 'Sample Background Track.mp3', targetDir: 'music', downloadUrl: dummyUrl },
  { id: 'anim-cam', name: 'Dynamic Camera Pan.vmd', type: 'Animation', sizeBytes: 150000, fileName: 'Dynamic Camera Pan.vmd', targetDir: 'vmd', downloadUrl: dummyUrl },
];

const getAssetsForSeries = (seriesId: TerminalSeriesId): AssetInfo[] => {
  if (seriesId === 'mienjine') return MIENJINE_ASSETS;
  return [];
};

export const registerAssetHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.launcher.getAssetList, async (_event, payload: unknown): Promise<GetAssetListResponse> => {
    const parsed = assetRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      return { ok: true, data: getAssetsForSeries(parsed.data.seriesId) };
    } catch (error: any) {
      logger.error('getAssetList failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.launcher.downloadAsset, async (event, payload: unknown) => {
    const parsed = downloadAssetRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    const request = parsed.data;
    logger.info(`downloadAsset: ${request.assetId}`);

    const asset = getAssetsForSeries(request.seriesId).find(a => a.id === request.assetId);
    if (!asset || !asset.downloadUrl) return { ok: false, error: 'Asset not found or no URL' };

    const config = await launcherConfigRepo.getConfig();
    const installPath = config.series[request.seriesId]?.installPath;
    if (!installPath) return { ok: false, error: 'Install path not set' };

    const targetDirFullPath = InputValidator.validateOutputRoot(installPath, asset.targetDir);
    const targetFilePath = InputValidator.validateOutputDir(targetDirFullPath, path.join(targetDirFullPath, asset.fileName));
    const tmpFilePath = `${targetFilePath}.tmp`;

    await fs.mkdir(targetDirFullPath, { recursive: true }).catch(() => {});
    await InputValidator.assertRealOutputDir(installPath, targetDirFullPath);
    await InputValidator.assertRealOutputDir(targetDirFullPath, targetFilePath);

    const downloadId = `dl_${randomUUID()}`;
    const controller = new AbortController();
    activeDownloads.set(downloadId, controller);

    (async () => {
      let fileStream: import('fs').WriteStream | null = null;
      try {
        const response = await fetch(asset.downloadUrl!, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error('No body');

        const reader = response.body.getReader();
        const totalBytes = Number(response.headers.get('content-length')) || asset.sizeBytes;
        if (totalBytes > MAX_ASSET_DOWNLOAD_BYTES) {
          throw new Error(`Asset download is too large: ${totalBytes} bytes`);
        }
        let downloadedBytes = 0;
        let lastReportTime = 0;

        fileStream = createWriteStream(tmpFilePath);

        event.sender.send(IPC_CHANNELS.launcher.onDownloadProgress, {
          downloadId, assetId: request.assetId, status: 'downloading', progress: 0, downloadedBytes, totalBytes
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value) {
            fileStream.write(value);
            downloadedBytes += value.length;
            if (downloadedBytes > MAX_ASSET_DOWNLOAD_BYTES) {
              throw new Error(`Asset download exceeded ${MAX_ASSET_DOWNLOAD_BYTES} bytes`);
            }

            const now = Date.now();
            if (now - lastReportTime > 200) {
              const progress = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
              event.sender.send(IPC_CHANNELS.launcher.onDownloadProgress, {
                downloadId, assetId: request.assetId, status: 'downloading', progress, downloadedBytes, totalBytes
              });
              lastReportTime = now;
            }
          }
        }

        fileStream.end();
        fileStream = null;

        await fs.rename(tmpFilePath, targetFilePath);

        event.sender.send(IPC_CHANNELS.launcher.onDownloadProgress, {
          downloadId, assetId: request.assetId, status: 'completed', progress: 100, downloadedBytes, totalBytes
        });
      } catch (err: any) {
        if (fileStream) fileStream.end();
        await fs.unlink(tmpFilePath).catch(() => {});

        const status = err.name === 'AbortError' ? 'canceled' : 'failed';
        event.sender.send(IPC_CHANNELS.launcher.onDownloadProgress, {
          downloadId, assetId: request.assetId, status, progress: 0, downloadedBytes: 0, error: err.message
        });
      } finally {
        activeDownloads.delete(downloadId);
      }
    })();

    return { ok: true, data: { downloadId } };
  });

  ipcMain.handle(IPC_CHANNELS.launcher.cancelDownload, async (_event, payload: unknown) => {
    const parsed = cancelDownloadRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    const { downloadId } = parsed.data;
    logger.info(`cancelDownload: ${downloadId}`);
    const controller = activeDownloads.get(downloadId);
    if (controller) {
      controller.abort();
      activeDownloads.delete(downloadId);
    }

    return { ok: true, data: null };
  });
};
