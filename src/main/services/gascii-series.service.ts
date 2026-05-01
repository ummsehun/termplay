import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
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
} from '@shared/launcherTypes';
import { createLogger } from '@shared/logger';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';

const logger = createLogger('gascii-series-service');

const GAScii_OWNER = 'ummsehun';
const GAScii_REPO = 'Gascii';
const GITHUB_REPO_URL = `https://github.com/${GAScii_OWNER}/${GAScii_REPO}`;
const LATEST_RELEASE_URL = `${GITHUB_REPO_URL}/releases/latest`;

type GithubReleaseAsset = {
  name: string;
  browser_download_url: string;
  size?: number;
};

type ReleaseVersion = {
  tag: string;
  parts: [number, number, number];
};

type SelectedRelease = {
  tag: string;
  asset: GithubReleaseAsset;
};

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

type TerminalLauncher = {
  name: string;
  appName?: string;
  executable: string;
  executablePaths: string[];
  args: (cwd: string, binaryPath: string) => string[];
};

const MAC_TERMINAL_PRIORITY: TerminalLauncher[] = [
  {
    name: 'Ghostty',
    appName: 'Ghostty',
    executable: 'ghostty',
    executablePaths: [
      '/Applications/Ghostty.app/Contents/MacOS/ghostty',
      `${process.env.HOME ?? ''}/Applications/Ghostty.app/Contents/MacOS/ghostty`,
    ],
    args: (cwd, binaryPath) => [`--working-directory=${cwd}`, '-e', binaryPath],
  },
  {
    name: 'kitty',
    appName: 'kitty',
    executable: 'kitty',
    executablePaths: [
      '/Applications/kitty.app/Contents/MacOS/kitty',
      `${process.env.HOME ?? ''}/Applications/kitty.app/Contents/MacOS/kitty`,
    ],
    args: (cwd, binaryPath) => ['--directory', cwd, '--start-as', 'fullscreen', binaryPath],
  },
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
      status: latest && this.compareTags(latest.tag, installed.installedVersion) > 0 ? 'update-available' : 'installed',
    };
  }

  async install(onProgress: InstallProgressListener): Promise<GasciiInstallInfo> {
    this.assertSupportedPlatform();
    this.emitInstall(onProgress, 'resolving', INSTALL_STAGES.resolving, 'Resolving latest Gascii release');

    const release = await this.resolveLatestRelease();
    const termRoot = launcherConfigRepo.getTermRoot();
    const downloadRoot = join(termRoot, '.downloads');
    const installPath = join(termRoot, 'gascii');
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
    await fs.rm(backupPath, { recursive: true, force: true });
    await fs.rm(archivePath, { force: true });

    this.emitInstall(onProgress, 'completed', INSTALL_STAGES.completed, `Gascii ${release.tag} installed`, release.tag);
    return info;
  }

  async launch(onProgress: LaunchProgressListener): Promise<{ terminal: string; binaryPath: string }> {
    this.assertSupportedPlatform();
    this.emitLaunch(onProgress, 0, 'Resolving Gascii launch request');

    const installed = await launcherConfigRepo.getGasciiInstallInfo();
    this.emitLaunch(onProgress, 1, 'Checking installed files');
    if (!installed) {
      throw new Error('Gascii is not installed');
    }

    this.emitLaunch(onProgress, 2, `Installed version: ${installed.installedVersion}`);

    this.emitLaunch(onProgress, 3, 'Verifying executable binary');
    await fs.access(installed.binaryPath, fs.constants.X_OK);

    this.emitLaunch(onProgress, 4, 'Preparing executable permissions');
    await this.prepareBinaryPermissions(installed.installPath, installed.binaryPath);

    this.emitLaunch(onProgress, 5, 'Preparing external terminal');
    this.emitLaunch(onProgress, 6, 'Launching Gascii');
    const terminal = this.launchInTerminal(installed.installPath, installed.binaryPath);

    onProgress({
      seriesId: 'gascii',
      stage: 'completed',
      stepLabel: 'Launching',
      progress: 100,
      message: `Launched in ${terminal}`,
    });

    return {
      terminal,
      binaryPath: installed.binaryPath,
    };
  }

  private async tryResolveLatestRelease(): Promise<SelectedRelease | null> {
    try {
      return await this.resolveLatestRelease();
    } catch (error) {
      logger.warn('latest release lookup failed', error);
      return null;
    }
  }

  private async resolveLatestRelease(): Promise<SelectedRelease> {
    const latestTag = await this.resolveLatestReleaseTag();
    const version = this.parseReleaseVersion(latestTag);
    const platformAssetSuffix = this.getAssetSuffix();

    if (!version) {
      throw new Error(`Unsupported Gascii release tag: ${latestTag}`);
    }

    const assetName = `gascii-${version.tag}-${platformAssetSuffix}`;

    return {
      tag: version.tag,
      asset: {
        name: assetName,
        browser_download_url: `${GITHUB_REPO_URL}/releases/download/${version.tag}/${assetName}`,
      },
    };
  }

  private async resolveLatestReleaseTag(): Promise<string> {
    const response = await fetch(LATEST_RELEASE_URL, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'TermPlay',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub latest release lookup failed: HTTP ${response.status}`);
    }

    const tag = this.parseTagFromReleaseUrl(response.url);
    if (tag) {
      return tag;
    }

    const fallbackResponse = await fetch(LATEST_RELEASE_URL, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'TermPlay',
      },
    });

    if (!fallbackResponse.ok) {
      throw new Error(`GitHub latest release lookup failed: HTTP ${fallbackResponse.status}`);
    }

    const fallbackTag = this.parseTagFromReleaseUrl(fallbackResponse.url);
    if (!fallbackTag) {
      throw new Error('Could not resolve latest Gascii release tag');
    }

    return fallbackTag;
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

  private launchInTerminal(cwd: string, binaryPath: string): string {
    if (platform() === 'darwin') {
      return this.launchInMacTerminalPriority(cwd, binaryPath);
    }

    return this.launchInLinuxTerminal(cwd, binaryPath);
  }

  private launchInMacTerminalPriority(cwd: string, binaryPath: string): string {
    for (const launcher of MAC_TERMINAL_PRIORITY) {
      const executable = this.resolveExecutable(launcher.executable, launcher.executablePaths);
      if (!executable) {
        logger.info('terminal unavailable', { terminal: launcher.name });
        continue;
      }

      try {
        if (launcher.name === 'Ghostty') {
          this.launchMacAppWithArgs('Ghostty.app', launcher.args(cwd, binaryPath));
        } else {
          this.launchTerminalProcess(executable, launcher.args(cwd, binaryPath));
        }
        if (launcher.appName) {
          this.requestMacFullscreen(launcher.appName);
        }
        return launcher.name;
      } catch (error) {
        logger.warn('terminal launch failed, trying next option', {
          terminal: launcher.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const commandText = this.shellQuote(binaryPath);
    const escapedCommand = commandText.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const script = `tell application "Terminal" to do script "${escapedCommand}"`;
    const result = spawnSync('osascript', ['-e', script], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    if (result.status !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`;
      throw new Error(`Terminal launch failed: ${detail}`);
    }

    this.requestMacFullscreen('Terminal');
    return 'Terminal';
  }

  private launchInLinuxTerminal(cwd: string, binaryPath: string): string {
    const candidates = [
      process.env.TERMINAL,
      'x-terminal-emulator',
      'gnome-terminal',
      'konsole',
      'xfce4-terminal',
    ].filter((item): item is string => Boolean(item));

    for (const terminal of candidates) {
      const executable = this.resolveExecutable(terminal, []);
      if (!executable) {
        continue;
      }

      try {
        this.launchTerminalProcess(executable, ['-e', 'sh', '-lc', `cd ${this.shellQuote(cwd)} && ${this.shellQuote(binaryPath)}`]);
        return terminal;
      } catch (error) {
        logger.warn('linux terminal launch failed, trying next option', {
          terminal,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    throw new Error('No supported Linux terminal was found');
  }

  private launchMacAppWithArgs(appName: string, args: string[]): void {
    const child = spawn('open', ['-na', appName, '--args', ...args], {
      detached: true,
      stdio: 'ignore',
    });

    child.once('error', (error) => {
      logger.error('mac app launch failed after launch', error);
    });
    child.unref();
  }

  private launchTerminalProcess(executable: string, args: string[]): ChildProcess {
    const child = spawn(executable, args, {
      detached: true,
      stdio: 'ignore',
    });

    child.once('error', (error) => {
      logger.error('terminal process failed after launch', error);
    });
    child.unref();

    return child;
  }

  private requestMacFullscreen(appName: string): void {
    const script = [
      `tell application "${appName}" to activate`,
      'delay 1.2',
      'tell application "System Events" to keystroke "f" using {control down, command down}',
    ].join('\n');

    const result = spawnSync('osascript', ['-e', script], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    if (result.status !== 0) {
      logger.warn('fullscreen request failed', { terminal: appName, detail: result.stderr.trim() || result.stdout.trim() });
    }
  }

  private resolveExecutable(executable: string, executablePaths: string[]): string | null {
    for (const executablePath of executablePaths) {
      if (executablePath && existsSync(executablePath)) {
        return executablePath;
      }
    }

    const result = spawnSync('/bin/sh', ['-lc', `command -v ${this.shellQuote(executable)}`], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const resolved = result.stdout.trim();

    return result.status === 0 && resolved ? resolved : null;
  }

  private getAssetSuffix(): string {
    if (platform() === 'darwin' && process.arch === 'arm64') {
      return 'darwin-arm64.tar.gz';
    }

    if (platform() === 'linux' && process.arch === 'x64') {
      return 'linux-x64.tar.gz';
    }

    throw new Error(`Unsupported platform: ${platform()} ${process.arch}`);
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

  private assertSupportedPlatform(): void {
    if (platform() === 'win32') {
      throw new Error('Windows support is not ready yet');
    }

    this.getAssetSuffix();
  }

  private parseReleaseVersion(tag: string): ReleaseVersion | null {
    const match = /^v(\d+)\.(\d+)(?:\.(\d+))?$/.exec(tag);
    if (!match) {
      return null;
    }

    return {
      tag,
      parts: [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)],
    };
  }

  private parseTagFromReleaseUrl(url: string): string | null {
    try {
      const parsedUrl = new URL(url);
      const match = /\/releases\/tag\/([^/]+)$/.exec(parsedUrl.pathname);
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  }

  private compareTags(left: string, right: string): number {
    const leftVersion = this.parseReleaseVersion(left);
    const rightVersion = this.parseReleaseVersion(right);

    if (!leftVersion || !rightVersion) {
      return 0;
    }

    return this.compareVersionParts(leftVersion.parts, rightVersion.parts);
  }

  private compareVersionParts(left: [number, number, number], right: [number, number, number]): number {
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) {
        return left[index] - right[index];
      }
    }

    return 0;
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

  private shellQuote(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`;
  }
}

export const gasciiSeriesService = new GasciiSeriesService();
