import { spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { platform } from 'node:os';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import {
  type GasciiInstallInfo,
  type SeriesInstallProgress,
  type SeriesLaunchProgress,
  type SeriesStatusInfo,
  type SeriesVerifyResult,
} from '@shared/launcherTypes';
import { createLogger } from '@shared/logger';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';
import { InputValidator } from '../downloader/inputValidator';
import { compareTags } from './gascii-version';
import { gasciiReleaseResolver, type GithubReleaseAsset, type SelectedRelease } from './gascii-release-resolver';
import { gasciiTerminalLauncher } from './gascii-terminal-launcher';

const logger = createLogger('gascii-series-service');

type InstallProgressListener = (event: SeriesInstallProgress) => void;
type LaunchProgressListener = (event: SeriesLaunchProgress) => void;

const INSTALL_STAGES = {
  resolving: 5,
  downloading: 10,
  extracting: 78,
  permissions: 92,
  completed: 100,
} as const;

const LAUNCH_STEPS: Array<{
  stage: SeriesLaunchProgress['stage'];
  label: string;
  progress: number;
}> = [
  { stage: 'resolving', label: 'Resolving app', progress: 8 },
  { stage: 'checking-installation', label: 'Checking installation', progress: 22 },
  { stage: 'checking-version', label: 'Checking version', progress: 36 },
  { stage: 'verifying-binary', label: 'Verifying binary', progress: 50 },
  { stage: 'preparing-permissions', label: 'Preparing permissions', progress: 64 },
  { stage: 'preparing-terminal', label: 'Preparing terminal', progress: 80 },
  { stage: 'launching', label: 'Launching', progress: 94 },
];

export class GasciiSeriesService {
  async getStatus(): Promise<SeriesStatusInfo> {
    const installed = await launcherConfigRepo.getGasciiInstallInfo();
    const latest = await this.tryResolveLatestRelease();

    if (!installed) {
      return {
        seriesId: 'gascii',
        installedVersion: null,
        latestVersion: latest?.tag ?? null,
        installPath: null,
        binaryPath: null,
        status: 'not-installed',
      };
    }

    return {
      seriesId: 'gascii',
      installedVersion: installed.installedVersion,
      latestVersion: latest?.tag ?? null,
      installPath: installed.installPath,
      binaryPath: installed.binaryPath,
      status: latest && compareTags(latest.tag, installed.installedVersion) > 0 ? 'update-available' : 'installed',
    };
  }

  async install(onProgress: InstallProgressListener): Promise<GasciiInstallInfo> {
    gasciiReleaseResolver.assertSupportedPlatform();
    this.emitInstall(onProgress, 'resolving', INSTALL_STAGES.resolving, 'Resolving latest Gascii release');

    const release = await gasciiReleaseResolver.resolveLatestRelease();
    const termRoot = launcherConfigRepo.getTermRoot();
    const downloadRoot = join(termRoot, '.downloads');
    const installPath = await this.resolveInstallPath();
    const backupPath = join(termRoot, 'gascii.previous');
    const stagingPath = join(termRoot, `.gascii-${Date.now()}`);
    const archivePath = join(downloadRoot, release.asset.name);

    await fs.mkdir(downloadRoot, { recursive: true });
    await fs.rm(archivePath, { force: true });

    await this.downloadAsset(release, archivePath, onProgress);
    await this.extractArchive(archivePath, stagingPath, installPath, backupPath, onProgress);

    const binaryPath = this.getBinaryPath(installPath);
    await this.preparePermissions(installPath, binaryPath, onProgress);

    const info: GasciiInstallInfo = {
      installedVersion: release.tag,
      installPath,
      binaryPath,
      lastInstalledAt: new Date().toISOString(),
    };
    await launcherConfigRepo.setGasciiInstallInfo(info);
    const config = await launcherConfigRepo.getConfig();
    config.series.gascii.installPath = installPath;
    await launcherConfigRepo.saveConfig(config);
    await fs.rm(backupPath, { recursive: true, force: true });
    await fs.rm(archivePath, { force: true });

    this.emitInstall(onProgress, 'completed', INSTALL_STAGES.completed, `Gascii ${release.tag} installed`, release.tag);
    return info;
  }

  async verify(): Promise<SeriesVerifyResult> {
    const installed = await launcherConfigRepo.getGasciiInstallInfo();
    if (!installed) {
      return {
        seriesId: 'gascii',
        ok: false,
        checkedPaths: [],
        missing: ['Gascii installation'],
        message: 'Gascii is not installed',
      };
    }

    const videoPath = join(installed.installPath, 'assets', 'video');
    const legacyVidioPath = join(installed.installPath, 'assets', 'vidio');
    const audioPath = join(installed.installPath, 'assets', 'audio');
    const checkedPaths = [installed.installPath, installed.binaryPath, videoPath, audioPath];
    const missing: string[] = [];

    if (!existsSync(installed.installPath)) {
      missing.push(installed.installPath);
    }

    if (!existsSync(installed.binaryPath)) {
      missing.push(installed.binaryPath);
    }

    const [videoCount, legacyVidioCount, audioCount] = await Promise.all([
      this.countFiles(videoPath),
      this.countFiles(legacyVidioPath),
      this.countFiles(audioPath),
    ]);

    if (videoCount + legacyVidioCount === 0) {
      missing.push(videoPath);
    }

    if (audioCount === 0) {
      missing.push(audioPath);
    }

    return {
      seriesId: 'gascii',
      ok: missing.length === 0,
      checkedPaths,
      missing,
      message: missing.length === 0 ? 'Gascii integrity check passed' : 'Gascii integrity check found missing files',
    };
  }

  async remove(): Promise<void> {
    const installed = await launcherConfigRepo.getGasciiInstallInfo();
    const installPath = installed?.installPath || (await this.resolveInstallPath());
    const managedRoot = launcherConfigRepo.getTermRoot();

    if (installPath) {
      if (InputValidator.isInsideDirectory(managedRoot, installPath)) {
        await fs.rm(installPath, { recursive: true, force: true });
      } else {
        logger.warn('skipped deleting unmanaged Gascii install path', { installPath, managedRoot });
      }
    }

    await launcherConfigRepo.clearGasciiInstallInfo();
    const config = await launcherConfigRepo.getConfig();
    config.series.gascii.installPath = '';
    await launcherConfigRepo.saveConfig(config);
  }

  async bindInstallPath(installPath: string): Promise<GasciiInstallInfo> {
    const binaryPath = this.getBinaryPath(installPath);
    await fs.access(binaryPath, fs.constants.X_OK);

    const installed = await launcherConfigRepo.getGasciiInstallInfo();
    const info: GasciiInstallInfo = {
      installedVersion: installed?.installedVersion ?? 'local',
      installPath,
      binaryPath,
      lastInstalledAt: installed?.lastInstalledAt ?? new Date().toISOString(),
    };

    await launcherConfigRepo.setGasciiInstallInfo(info);
    const config = await launcherConfigRepo.getConfig();
    config.series.gascii.installPath = installPath;
    await launcherConfigRepo.saveConfig(config);

    return info;
  }

  async launch(onProgress: LaunchProgressListener): Promise<{ terminal: string; binaryPath: string }> {
    gasciiReleaseResolver.assertSupportedPlatform();
    this.emitLaunch(onProgress, 0, 'Resolving Gascii launch request');
    await this.pauseForSplashStep();

    const installed = await launcherConfigRepo.getGasciiInstallInfo();
    this.emitLaunch(onProgress, 1, 'Checking installed files');
    await this.pauseForSplashStep();
    if (!installed) {
      throw new Error('Gascii is not installed');
    }

    this.emitLaunch(onProgress, 2, `Installed version: ${installed.installedVersion}`);
    await this.pauseForSplashStep();

    this.emitLaunch(onProgress, 3, 'Verifying executable binary');
    await fs.access(installed.binaryPath, fs.constants.X_OK);
    await this.ensureGasciiAssetsReady(installed.installPath);
    await this.pauseForSplashStep();

    this.emitLaunch(onProgress, 4, 'Preparing executable permissions');
    await this.prepareBinaryPermissions(installed.installPath, installed.binaryPath);
    await this.pauseForSplashStep();

    this.emitLaunch(onProgress, 5, 'Preparing external terminal');
    await this.pauseForSplashStep();

    this.emitLaunch(onProgress, 6, 'Launching Gascii');
    await this.pauseForSplashStep();
    onProgress({
      seriesId: 'gascii',
      stage: 'completed',
      stepLabel: 'Launching',
      progress: 100,
      message: 'Opening external terminal',
    });
    await this.pauseForSplashComplete();

    const terminal = gasciiTerminalLauncher.launch(installed.installPath, installed.binaryPath);

    return {
      terminal,
      binaryPath: installed.binaryPath,
    };
  }

  private async tryResolveLatestRelease(): Promise<SelectedRelease | null> {
    try {
      return await gasciiReleaseResolver.resolveLatestRelease();
    } catch (error) {
      logger.warn('latest release lookup failed', error);
      return null;
    }
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
    let downloadedBytes = 0;
    const nodeStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
    nodeStream.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;
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

    const result = spawnSync('tar', ['-xzf', archivePath, '-C', stagingPath], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    if (result.status !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`;
      throw new Error(`Archive extraction failed: ${detail}`);
    }

    const extractedRoot = await this.resolveExtractedRoot(stagingPath);
    await fs.rm(backupPath, { recursive: true, force: true });

    try {
      if (existsSync(installPath)) {
        await fs.rename(installPath, backupPath);
      }
      await fs.rename(extractedRoot, installPath);
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
    binaryPath: string,
    onProgress: InstallProgressListener,
  ): Promise<void> {
    this.emitInstall(onProgress, 'permissions', INSTALL_STAGES.permissions, 'Preparing binary permissions');
    await this.prepareBinaryPermissions(installPath, binaryPath);
  }

  private async prepareBinaryPermissions(installPath: string, binaryPath: string): Promise<void> {
    await fs.chmod(binaryPath, 0o755);

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

  private async resolveExtractedRoot(stagingPath: string): Promise<string> {
    const entries = await fs.readdir(stagingPath, { withFileTypes: true });

    if (existsSync(this.getBinaryPath(stagingPath))) {
      return stagingPath;
    }

    const directories = entries.filter((entry) => entry.isDirectory());
    if (directories.length === 1) {
      return join(stagingPath, directories[0].name);
    }

    throw new Error('Archive layout is not supported');
  }

  private async resolveInstallPath(): Promise<string> {
    const config = await launcherConfigRepo.getConfig();
    return config.series.gascii.installPath || join(launcherConfigRepo.getTermRoot(), 'gascii');
  }

  private async ensureGasciiAssetsReady(installPath: string): Promise<void> {
    const assetsPath = join(installPath, 'assets');
    const videoPath = join(assetsPath, 'video');
    const audioPath = join(assetsPath, 'audio');
    const legacyVidioPath = join(assetsPath, 'vidio');

    await fs.mkdir(videoPath, { recursive: true });
    await fs.mkdir(audioPath, { recursive: true });

    const [videoCount, legacyVidioCount, audioCount] = await Promise.all([
      this.countFiles(videoPath),
      this.countFiles(legacyVidioPath),
      this.countFiles(audioPath),
    ]);

    if (videoCount + legacyVidioCount === 0 || audioCount === 0) {
      throw new Error('Gascii assets are missing. Open Library and add media files to assets/video and assets/audio.');
    }
  }

  private async countFiles(directoryPath: string): Promise<number> {
    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });
      return entries.filter((entry) => entry.isFile()).length;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return 0;
      }

      throw error;
    }
  }

  private getBinaryPath(installPath: string): string {
    if (platform() === 'darwin') {
      return join(installPath, 'bin', 'gascii');
    }

    if (platform() === 'linux') {
      return join(installPath, 'bin', 'gascii-bin');
    }

    throw new Error('Windows support is not ready yet');
  }

  private emitInstall(
    onProgress: InstallProgressListener,
    stage: SeriesInstallProgress['stage'],
    progress: number,
    message: string,
    version?: string,
  ): void {
    onProgress({
      seriesId: 'gascii',
      stage,
      progress,
      message,
      version,
    });
  }

  private emitLaunch(onProgress: LaunchProgressListener, stepIndex: number, message: string): void {
    const step = LAUNCH_STEPS[stepIndex];
    onProgress({
      seriesId: 'gascii',
      stage: step.stage,
      stepLabel: step.label,
      progress: step.progress,
      message,
    });
  }

  private async pauseForSplashStep(): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, 260);
    });
  }

  private async pauseForSplashComplete(): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, 700);
    });
  }
}

export const gasciiSeriesService = new GasciiSeriesService();
