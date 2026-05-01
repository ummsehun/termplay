import { spawn, ChildProcess } from 'child_process';
import { ProgressParser } from './progressParser';
import fs from 'fs/promises';
import path from 'path';
import { type MediaDownloadProgress } from '@shared/launcherTypes';

export interface ProcessRunnerOptions {
  jobId: string;
  binPath: string;
  args: string[];
  outputDir: string;
  onProgress?: (event: MediaDownloadProgress) => void;
}

export type JobStatus = 'running' | 'completed' | 'cancelled' | 'failed';

export class ProcessRunner {
  private child: ChildProcess | null = null;
  private isCancelled = false;
  private jobId: string;
  private outputDir: string;
  private stdoutBuffer = '';
  private stderrBuffer = '';

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

      const handleLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        lastErrorLine = trimmed;

        const parsed = ProgressParser.parseLine(trimmed, this.jobId);
        if (parsed && this.options.onProgress) {
          this.options.onProgress(parsed);
        }
      };

      const handleOutput = (streamName: 'stdout' | 'stderr', data: Buffer) => {
        const text = (streamName === 'stdout' ? this.stdoutBuffer : this.stderrBuffer) + data.toString('utf-8');
        const lines = text.split(/\r?\n/);
        const nextBuffer = lines.pop() ?? '';

        if (streamName === 'stdout') {
          this.stdoutBuffer = nextBuffer;
        } else {
          this.stderrBuffer = nextBuffer;
        }

        for (const line of lines) {
          handleLine(line);
        }
      };

      this.child.stdout?.on('data', (data: Buffer) => handleOutput('stdout', data));
      this.child.stderr?.on('data', (data: Buffer) => handleOutput('stderr', data));

      this.child.on('close', (code, signal) => {
        handleLine(this.stdoutBuffer);
        handleLine(this.stderrBuffer);
        this.stdoutBuffer = '';
        this.stderrBuffer = '';

        if (this.isCancelled) {
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
    let didClose = false;

    const killTimeout = setTimeout(() => {
      if (this.child && !didClose) {
        this.child.kill('SIGKILL');
      }
    }, 3000);

    return new Promise((resolve) => {
      this.child!.on('close', async () => {
        didClose = true;
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
