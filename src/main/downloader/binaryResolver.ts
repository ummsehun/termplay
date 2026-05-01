import path from 'path';
import { app } from 'electron';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class BinaryResolver {
  private static get resourcesPath() {
    return app.isPackaged
      ? process.resourcesPath
      : path.resolve(process.cwd(), 'resources');
  }

  private static get platformDir() {
    return `${process.platform}-${process.arch}`;
  }

  static get ytDlpPath() {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(this.resourcesPath, 'bin', this.platformDir, `yt-dlp${ext}`);
  }

  static get ffmpegPath() {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(this.resourcesPath, 'bin', this.platformDir, `ffmpeg${ext}`);
  }

  static async assertExecutable(filePath: string): Promise<void> {
    try {
      await fs.access(filePath, fs.constants.X_OK);
    } catch {
      throw new Error(`Binary not found or not executable at: ${filePath}`);
    }
  }

  static async checkYtDlpVersion(): Promise<string> {
    await this.assertExecutable(this.ytDlpPath);
    const { stdout } = await execFileAsync(this.ytDlpPath, ['--version']);
    return stdout.trim();
  }

  static async checkFfmpegAvailable(): Promise<string> {
    await this.assertExecutable(this.ffmpegPath);
    const { stdout } = await execFileAsync(this.ffmpegPath, ['-version']);
    return stdout.split('\n')[0].trim();
  }
}
