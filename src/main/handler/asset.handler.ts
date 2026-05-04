import { ipcMain } from 'electron';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { createHash, randomUUID } from 'crypto';
import { once } from 'events';
import path from 'path';
import { IPC_CHANNELS } from '@shared/ipc';
import { createLogger } from '@shared/logger';
import { type AssetInfo, type GetAssetListResponse, type TerminalSeriesId } from '@shared/launcherTypes';
import { assetRequestSchema, cancelDownloadRequestSchema, downloadAssetRequestSchema } from '@shared/launcherSchemas';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';
import { InputValidator } from '../downloader/inputValidator';
import { assertManagedInstallPath } from '../security/installPathPolicy';
import { SERIES_ASSET_CATALOG } from '../services/series-definitions';

const logger = createLogger('asset-handler');

const activeDownloads = new Map<string, AbortController>();
const MAX_ASSET_DOWNLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const getAssetsForSeries = (seriesId: TerminalSeriesId): AssetInfo[] => {
  return [...SERIES_ASSET_CATALOG[seriesId]];
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
    const configuredInstallPath = config.series[request.seriesId]?.installPath;
    if (!configuredInstallPath) return { ok: false, error: 'Install path not set' };
    const installPath = await assertManagedInstallPath(request.seriesId, configuredInstallPath);

    const assetRoot = path.join(installPath, 'assets');
    const targetDirFullPath = InputValidator.validateOutputRoot(assetRoot, asset.targetDir);
    const targetFilePath = InputValidator.validateOutputDir(targetDirFullPath, path.join(targetDirFullPath, asset.fileName));
    const tmpFilePath = `${targetFilePath}.tmp`;

    await fs.mkdir(targetDirFullPath, { recursive: true }).catch(() => {});
    await InputValidator.assertRealOutputDir(assetRoot, targetDirFullPath);
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
        const checksumHash = asset.checksum ? createHash('sha256') : null;

        fileStream = createWriteStream(tmpFilePath);

        event.sender.send(IPC_CHANNELS.launcher.onDownloadProgress, {
          downloadId, assetId: request.assetId, status: 'downloading', progress: 0, downloadedBytes, totalBytes
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value) {
            checksumHash?.update(value);
            if (!fileStream.write(value)) {
              await once(fileStream, 'drain');
            }
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

        await new Promise<void>((resolve, reject) => {
          fileStream?.once('error', reject);
          fileStream?.end(resolve);
        });
        fileStream = null;

        if (asset.checksum && checksumHash) {
          event.sender.send(IPC_CHANNELS.launcher.onDownloadProgress, {
            downloadId, assetId: request.assetId, status: 'verifying', progress: 100, downloadedBytes, totalBytes
          });

          const expectedChecksum = asset.checksum.replace(/^sha256:/i, '').toLowerCase();
          const actualChecksum = checksumHash.digest('hex');
          if (actualChecksum !== expectedChecksum) {
            throw new Error(`Asset checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
          }
        }

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
