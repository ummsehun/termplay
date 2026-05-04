import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { platform } from 'node:os';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { type MienjineInstallInfo, type SeriesInstallProgress } from '@shared/launcherTypes';
import { createLogger } from '@shared/logger';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';
import { getMienjineStartScriptPath, MIENJINE_ASSET_DIRS, resolveMienjineInstallPath } from './mienjine-paths';
import { type SelectedRelease } from './gascii-release-resolver';
import { assertNoSymlinks, assertSafeTarArchiveEntries, verifySha256Digest } from './archive-install-utils';

const logger = createLogger('mienjine-installer');

type InstallProgressListener = (event: SeriesInstallProgress) => void;

const INSTALL_STAGES = {
  downloading: 10,
  extracting: 78,
  permissions: 92,
} as const;

const MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024;

export class MienjineInstaller {
  async install(release: SelectedRelease, onProgress: InstallProgressListener): Promise<MienjineInstallInfo> {
    const termRoot = launcherConfigRepo.getTermRoot();
    const downloadRoot = join(termRoot, '.downloads');
    const installPath = await resolveMienjineInstallPath();
    const backupPath = join(termRoot, 'mienjine.previous');
    const stagingPath = join(termRoot, `.mienjine-${Date.now()}`);
    const archivePath = join(downloadRoot, release.asset.name);

    await fs.mkdir(downloadRoot, { recursive: true });
    await fs.rm(archivePath, { force: true });

    await this.downloadAsset(release, archivePath, onProgress);
    await this.extractArchive(archivePath, stagingPath, installPath, backupPath, onProgress);

    const startScriptPath = getMienjineStartScriptPath(installPath);
    await this.preparePermissions(installPath, startScriptPath, onProgress);
    await this.ensureAssetDirs(installPath);
    await fs.rm(backupPath, { recursive: true, force: true });
    await fs.rm(archivePath, { force: true });

    return {
      installedVersion: release.tag,
      installPath,
      binaryPath: startScriptPath,
      lastInstalledAt: new Date().toISOString(),
    };
  }

  async prepareStartScriptPermissions(installPath: string, startScriptPath: string): Promise<void> {
    await fs.chmod(startScriptPath, 0o755);

    if (platform() === 'darwin') {
      const result = spawnSync('xattr', ['-dr', 'com.apple.quarantine', installPath], {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      if (result.status !== 0) {
        logger.warn('xattr quarantine cleanup failed', result.stderr.trim() || result.stdout.trim());
      }
    }
  }

  async ensureAssetDirs(installPath: string): Promise<void> {
    await Promise.all(MIENJINE_ASSET_DIRS.map((dir) => fs.mkdir(join(installPath, 'assets', dir), { recursive: true })));
  }

  private async downloadAsset(
    release: SelectedRelease,
    archivePath: string,
    onProgress: InstallProgressListener,
  ): Promise<void> {
    this.emitInstall(onProgress, 'downloading', INSTALL_STAGES.downloading, `Downloading ${release.asset.name}`, release.tag);
    const response = await fetch(release.asset.browser_download_url);

    if (!response.ok || !response.body) {
      throw new Error(`Download failed: HTTP ${response.status}`);
    }

    const totalBytes = Number(response.headers.get('content-length')) || release.asset.size || 0;
    if (totalBytes > MAX_ARCHIVE_BYTES) {
      throw new Error(`Download is too large: ${totalBytes} bytes`);
    }

    let downloadedBytes = 0;
    const hash = createHash('sha256');
    const nodeStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
    nodeStream.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;
      if (downloadedBytes > MAX_ARCHIVE_BYTES) {
        nodeStream.destroy(new Error(`Download exceeded ${MAX_ARCHIVE_BYTES} bytes`));
        return;
      }

      hash.update(chunk);
      if (totalBytes > 0) {
        const ratio = downloadedBytes / totalBytes;
        const progress = INSTALL_STAGES.downloading + Math.round(ratio * 62);
        this.emitInstall(
          onProgress,
          'downloading',
          Math.min(72, progress),
          `Downloading ${basename(archivePath)}`,
          release.tag,
        );
      }
    });

    await pipeline(nodeStream, createWriteStream(archivePath));
    verifySha256Digest(release.asset.digest, hash.digest('hex'));
  }

  private async extractArchive(
    archivePath: string,
    stagingPath: string,
    installPath: string,
    backupPath: string,
    onProgress: InstallProgressListener,
  ): Promise<void> {
    this.emitInstall(onProgress, 'extracting', INSTALL_STAGES.extracting, 'Extracting archive');
    await fs.rm(stagingPath, { recursive: true, force: true });
    await fs.mkdir(stagingPath, { recursive: true });
    assertSafeTarArchiveEntries(archivePath);

    const result = spawnSync('tar', ['-xzf', archivePath, '-C', stagingPath], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    if (result.status !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`;
      throw new Error(`Archive extraction failed: ${detail}`);
    }

    await assertNoSymlinks(stagingPath);
    const extractedRoot = await this.resolveExtractedRoot(stagingPath);
    await fs.rm(backupPath, { recursive: true, force: true });

    try {
      if (existsSync(installPath)) {
        await fs.rename(installPath, backupPath);
      }
      await fs.rename(extractedRoot, installPath);
      await this.assertStartScriptInsideInstallPath(installPath);
    } catch (error) {
      await fs.rm(installPath, { recursive: true, force: true });
      if (existsSync(backupPath)) {
        await fs.rename(backupPath, installPath);
      }
      throw error;
    } finally {
      await fs.rm(stagingPath, { recursive: true, force: true });
    }
  }

  private async preparePermissions(
    installPath: string,
    startScriptPath: string,
    onProgress: InstallProgressListener,
  ): Promise<void> {
    this.emitInstall(onProgress, 'permissions', INSTALL_STAGES.permissions, 'Preparing start script permissions');
    await this.prepareStartScriptPermissions(installPath, startScriptPath);
  }

  private async resolveExtractedRoot(stagingPath: string): Promise<string> {
    const entries = await fs.readdir(stagingPath, { withFileTypes: true });

    if (existsSync(getMienjineStartScriptPath(stagingPath))) {
      return stagingPath;
    }

    const directories = entries.filter((entry) => entry.isDirectory());
    if (directories.length === 1) {
      return join(stagingPath, directories[0].name);
    }

    throw new Error('Archive layout is not supported');
  }

  private async assertStartScriptInsideInstallPath(installPath: string): Promise<void> {
    const realInstallPath = await fs.realpath(installPath);
    const realStartScriptPath = await fs.realpath(getMienjineStartScriptPath(installPath));
    const relativeStartScriptPath = relative(realInstallPath, realStartScriptPath);
    if (
      relativeStartScriptPath.startsWith('..') ||
      isAbsolute(relativeStartScriptPath) ||
      resolve(realInstallPath, relativeStartScriptPath) !== realStartScriptPath
    ) {
      throw new Error('Mienjine start script resolves outside the install directory');
    }
  }

  private emitInstall(
    onProgress: InstallProgressListener,
    stage: SeriesInstallProgress['stage'],
    progress: number,
    message: string,
    version?: string,
  ): void {
    onProgress({
      seriesId: 'mienjine',
      stage,
      progress,
      message,
      version,
    });
  }
}

export const mienjineInstaller = new MienjineInstaller();
