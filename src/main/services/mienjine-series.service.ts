import fs from 'node:fs/promises';
import {
  type MienjineInstallInfo,
  type SeriesInstallProgress,
  type SeriesLaunchProgress,
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

const logger = createLogger('mienjine-series-service');

type InstallProgressListener = (event: SeriesInstallProgress) => void;
type LaunchProgressListener = (event: SeriesLaunchProgress) => void;

const LATEST_RELEASE_FAILURE_LOG_INTERVAL_MS = 5 * 60 * 1000;

const LAUNCH_STEPS: Array<{
  stage: SeriesLaunchProgress['stage'];
  label: string;
  progress: number;
}> = [
  { stage: 'resolving', label: 'Resolving app', progress: 8 },
  { stage: 'checking-installation', label: 'Checking installation', progress: 22 },
  { stage: 'checking-version', label: 'Checking version', progress: 36 },
  { stage: 'verifying-binary', label: 'Verifying start script', progress: 50 },
  { stage: 'preparing-permissions', label: 'Preparing permissions', progress: 64 },
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
    mienjineReleaseResolver.assertSupportedPlatform();
    this.emitLaunch(onProgress, 0, 'Resolving Mienjine launch request');
    await this.pauseForSplashStep();

    const installed = await launcherConfigRepo.getMienjineInstallInfo();
    this.emitLaunch(onProgress, 1, 'Checking installed files');
    await this.pauseForSplashStep();
    if (!installed) {
      throw new Error('Mienjine is not installed');
    }
    const installPath = await assertManagedInstallPath('mienjine', installed.installPath);
    const startScriptPath = getMienjineStartScriptPath(installPath);

    this.emitLaunch(onProgress, 2, `Installed version: ${installed.installedVersion}`);
    await this.pauseForSplashStep();

    this.emitLaunch(onProgress, 3, 'Verifying start script');
    await mienjineIntegrityService.ensureReady(installPath);
    await this.pauseForSplashStep();

    this.emitLaunch(onProgress, 4, 'Preparing start script permissions');
    await mienjineInstaller.prepareStartScriptPermissions(installPath, startScriptPath);
    await this.pauseForSplashStep();

    this.emitLaunch(onProgress, 5, 'Preparing external terminal');
    await this.pauseForSplashStep();

    this.emitLaunch(onProgress, 6, 'Launching Mienjine');
    await this.pauseForSplashStep();
    onProgress({
      seriesId: 'mienjine',
      stage: 'completed',
      stepLabel: 'Launching',
      progress: 100,
      message: 'Opening external terminal',
    });
    await this.pauseForSplashComplete();

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

  private emitLaunch(onProgress: LaunchProgressListener, stepIndex: number, message: string): void {
    const step = LAUNCH_STEPS[stepIndex];
    onProgress({
      seriesId: 'mienjine',
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

export const mienjineSeriesService = new MienjineSeriesService();
