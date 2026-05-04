import fs from 'node:fs/promises';
import {
  type MienjineInstallInfo,
  type SeriesInstallProgress,
  type SeriesStatusInfo,
  type SeriesVerifyResult,
} from '@shared/launcherTypes';
import { createLogger } from '@shared/logger';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';
import { InputValidator } from '../downloader/inputValidator';
import { GithubReleaseLookupError, type SelectedRelease } from './gascii-release-resolver';
import { mienjineReleaseResolver } from './mienjine-release-resolver';
import { mienjineInstaller } from './mienjine-installer';
import { mienjineIntegrityService } from './mienjine-integrity';
import { getMienjineStartScriptPath, resolveMienjineInstallPath } from './mienjine-paths';
import { mienjineTerminalLauncher } from './mienjine-terminal-launcher';
import { compareTags } from './gascii-version';
import { assertManagedInstallPath } from '../security/installPathPolicy';
import { type LaunchProgressListener, SeriesLaunchProgressEmitter, type LaunchStepDefinition } from './series-launch-progress';

const logger = createLogger('mienjine-series-service');

type InstallProgressListener = (event: SeriesInstallProgress) => void;

const LATEST_RELEASE_FAILURE_LOG_INTERVAL_MS = 5 * 60 * 1000;

const MIENJINE_LAUNCH_STEPS: LaunchStepDefinition[] = [
  { stage: 'resolving', label: 'Resolving app', progress: 8 },
  { stage: 'checking-installation', label: 'Checking installation', progress: 22 },
  { stage: 'checking-version', label: 'Checking version', progress: 36 },
  { stage: 'verifying-binary', label: 'Verifying assets', progress: 50 },
  { stage: 'preparing-permissions', label: 'Applying security checks', progress: 64 },
  { stage: 'preparing-terminal', label: 'Preparing terminal', progress: 80 },
  { stage: 'launching', label: 'Launching', progress: 94 },
];

export class MienjineSeriesService {
  private lastReleaseFailureLog: { key: string; loggedAt: number } | null = null;

  async getStatus(): Promise<SeriesStatusInfo> {
    const installed = await launcherConfigRepo.getMienjineInstallInfo();
    const release = await this.tryResolveRelease();

    if (!installed) {
      return {
        seriesId: 'mienjine',
        installedVersion: null,
        latestVersion: release?.tag ?? null,
        installPath: null,
        binaryPath: null,
        status: 'not-installed',
      };
    }

    const managedInstalled = await this.resolveManagedInstallInfo(installed);
    if (!managedInstalled) {
      return {
        seriesId: 'mienjine',
        installedVersion: null,
        latestVersion: release?.tag ?? null,
        installPath: null,
        binaryPath: null,
        status: 'not-installed',
      };
    }

    return {
      seriesId: 'mienjine',
      installedVersion: managedInstalled.installedVersion,
      latestVersion: release?.tag ?? null,
      installPath: managedInstalled.installPath,
      binaryPath: managedInstalled.binaryPath,
      status: release && compareTags(release.tag, managedInstalled.installedVersion) > 0 ? 'update-available' : 'installed',
    };
  }

  async install(onProgress: InstallProgressListener): Promise<MienjineInstallInfo> {
    mienjineReleaseResolver.assertSupportedPlatform();
    this.emitInstall(onProgress, 'resolving', 5, 'Resolving Mienjine release');

    const release = await mienjineReleaseResolver.resolveRelease();
    const info = await mienjineInstaller.install(release, onProgress);
    await launcherConfigRepo.setMienjineInstallInfo(info);
    const config = await launcherConfigRepo.getConfig();
    config.series.mienjine.installPath = info.installPath;
    await launcherConfigRepo.saveConfig(config);

    this.emitInstall(onProgress, 'completed', 100, `Mienjine ${release.tag} installed`, release.tag);
    return info;
  }

  async verify(): Promise<SeriesVerifyResult> {
    const installed = await launcherConfigRepo.getMienjineInstallInfo();
    return mienjineIntegrityService.verify(installed);
  }

  async remove(): Promise<void> {
    const installed = await launcherConfigRepo.getMienjineInstallInfo();
    const installPath = installed?.installPath || (await resolveMienjineInstallPath());
    const managedRoot = launcherConfigRepo.getTermRoot();

    if (installPath) {
      if (await InputValidator.isRealInsideDirectory(managedRoot, installPath)) {
        await fs.rm(installPath, { recursive: true, force: true });
      } else {
        logger.warn('skipped deleting unmanaged Mienjine install path', { installPath, managedRoot });
      }
    }

    await launcherConfigRepo.clearMienjineInstallInfo();
    const config = await launcherConfigRepo.getConfig();
    config.series.mienjine.installPath = '';
    await launcherConfigRepo.saveConfig(config);
  }

  async bindInstallPath(installPath: string): Promise<MienjineInstallInfo> {
    const managedInstallPath = await assertManagedInstallPath('mienjine', installPath);
    const startScriptPath = getMienjineStartScriptPath(managedInstallPath);
    await fs.access(startScriptPath, fs.constants.X_OK);
    await mienjineInstaller.ensureAssetDirs(managedInstallPath);

    const installed = await launcherConfigRepo.getMienjineInstallInfo();
    const info: MienjineInstallInfo = {
      installedVersion: installed?.installedVersion ?? 'local',
      installPath: managedInstallPath,
      binaryPath: startScriptPath,
      lastInstalledAt: installed?.lastInstalledAt ?? new Date().toISOString(),
    };

    await launcherConfigRepo.setMienjineInstallInfo(info);
    const config = await launcherConfigRepo.getConfig();
    config.series.mienjine.installPath = installPath;
    await launcherConfigRepo.saveConfig(config);

    return info;
  }

  async launch(onProgress: LaunchProgressListener): Promise<{ terminal: string; binaryPath: string }> {
    const progress = new SeriesLaunchProgressEmitter('mienjine', onProgress, MIENJINE_LAUNCH_STEPS);
    mienjineReleaseResolver.assertSupportedPlatform();
    progress.emit(0, 'Resolving Mienjine launch request');
    await progress.pauseStep();

    const installed = await launcherConfigRepo.getMienjineInstallInfo();
    progress.emit(1, 'Checking installed files');
    await progress.pauseStep();
    if (!installed) {
      throw new Error('Mienjine is not installed');
    }
    const installPath = await assertManagedInstallPath('mienjine', installed.installPath);
    const startScriptPath = getMienjineStartScriptPath(installPath);

    progress.emit(2, `Installed version: ${installed.installedVersion}`);
    await progress.pauseStep();

    progress.emit(3, 'Verifying start script and required model assets');
    await mienjineIntegrityService.ensureReady(installPath);
    await progress.pauseStep();

    progress.emit(4, 'Applying permissions and quarantine cleanup');
    await mienjineInstaller.prepareStartScriptPermissions(installPath, startScriptPath);
    await progress.pauseStep();

    progress.emit(5, 'Preparing external terminal');
    await progress.pauseStep();

    progress.emit(6, 'Launching Mienjine');
    await progress.pauseStep();
    progress.complete();
    await progress.pauseComplete();

    const terminal = mienjineTerminalLauncher.launch(installPath, startScriptPath);

    return {
      terminal,
      binaryPath: startScriptPath,
    };
  }

  private async tryResolveRelease(): Promise<SelectedRelease | null> {
    try {
      return await mienjineReleaseResolver.resolveRelease();
    } catch (error) {
      this.logReleaseFailure(error);
      return null;
    }
  }

  private async resolveManagedInstallInfo(installed: MienjineInstallInfo): Promise<MienjineInstallInfo | null> {
    try {
      const installPath = await assertManagedInstallPath('mienjine', installed.installPath);
      return {
        ...installed,
        installPath,
        binaryPath: getMienjineStartScriptPath(installPath),
      };
    } catch (error) {
      logger.warn('ignored unmanaged Mienjine install path', {
        installPath: installed.installPath,
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private logReleaseFailure(error: unknown): void {
    const now = Date.now();
    const message = error instanceof Error ? error.message : String(error);
    const key = error instanceof GithubReleaseLookupError ? `${error.status}:${message}` : message;

    if (
      this.lastReleaseFailureLog &&
      this.lastReleaseFailureLog.key === key &&
      now - this.lastReleaseFailureLog.loggedAt < LATEST_RELEASE_FAILURE_LOG_INTERVAL_MS
    ) {
      return;
    }

    this.lastReleaseFailureLog = { key, loggedAt: now };

    if (error instanceof GithubReleaseLookupError) {
      logger.warn('Mienjine release lookup failed', {
        status: error.status,
        message: error.message,
        responseMessage: error.responseMessage,
        rateLimitReset: error.rateLimitReset,
      });
      return;
    }

    logger.warn('Mienjine release lookup failed', { message });
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

export const mienjineSeriesService = new MienjineSeriesService();
