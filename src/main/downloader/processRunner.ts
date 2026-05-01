import { spawn, ChildProcess } from 'child_process';
import { ProgressParser, DownloadProgressEvent } from './progressParser';
import fs from 'fs/promises';
import path from 'path';

export interface ProcessRunnerOptions {
  jobId: string;
  binPath: string;
  args: string[];
  outputDir: string;
  onProgress?: (event: DownloadProgressEvent) => void;
}

export type JobStatus = 'running' | 'completed' | 'cancelled' | 'failed';

export class ProcessRunner {
  private child: ChildProcess | null = null;
  private isCancelled = false;
  private jobId: string;
  private outputDir: string;

  constructor(private options: ProcessRunnerOptions) {
    this.jobId = options.jobId;
    this.outputDir = options.outputDir;
  }

  run(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.child = spawn(this.options.binPath, this.options.args, {
        shell: false,
        windowsHide: true,
      });

      let lastErrorLine = '';

      const handleOutput = (data: Buffer) => {
        const lines = data.toString('utf-8').split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          
          lastErrorLine = line; // keep track for error reporting

          const parsed = ProgressParser.parseLine(line, this.jobId);
          if (parsed && this.options.onProgress) {
            this.options.onProgress(parsed);
          }
        }
      };

      this.child.stdout?.on('data', handleOutput);
      this.child.stderr?.on('data', handleOutput);

      this.child.on('close', (code, signal) => {
        if (this.isCancelled) {
          // If cancelled, we resolve normally or throw a specific cancel error?
          // The caller handles 'cancelled' state. We can reject with a CancelError.
          reject(new Error('CANCELLED'));
          return;
        }

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yt-dlp failed with code ${code}, signal ${signal}. Last log: ${lastErrorLine}`));
        }
      });

      this.child.on('error', (err) => {
        reject(err);
      });
    });
  }

  async cancel(): Promise<void> {
    if (!this.child || this.child.killed) return;
    this.isCancelled = true;

    // Phase 7.6: SIGTERM -> Timeout -> SIGKILL
    this.child.kill('SIGTERM');

    const killTimeout = setTimeout(() => {
      if (this.child && !this.child.killed) {
        this.child.kill('SIGKILL');
      }
    }, 3000);

    return new Promise((resolve) => {
      this.child!.on('close', async () => {
        clearTimeout(killTimeout);
        await this.cleanupTempFiles();
        resolve();
      });
    });
  }

  private async cleanupTempFiles() {
    try {
      const files = await fs.readdir(this.outputDir);
      for (const file of files) {
        if (file.endsWith('.part') || file.endsWith('.ytdl') || file.endsWith('.temp')) {
          await fs.unlink(path.join(this.outputDir, file)).catch(() => {});
        }
      }
    } catch {
      // Ignored
    }
  }
}
