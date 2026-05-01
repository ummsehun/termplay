import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';
import { createLogger } from '@shared/logger';

const logger = createLogger('gascii-terminal-launcher');

type TerminalLauncher = {
  name: string;
  executable: string;
  executablePaths: string[];
  args: (cwd: string, binaryPath: string) => string[];
};

const shellQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

const MAC_TERMINAL_PRIORITY: TerminalLauncher[] = [
  {
    name: 'Ghostty',
    executable: 'ghostty',
    executablePaths: [
      '/Applications/Ghostty.app/Contents/MacOS/ghostty',
      `${process.env.HOME ?? ''}/Applications/Ghostty.app/Contents/MacOS/ghostty`,
    ],
    args: (cwd, binaryPath) => [`--working-directory=${cwd}`, '-e', 'sh', '-lc', `${shellQuote(binaryPath)}; exit_code=$?; printf "\\nGascii exited with code %s. Press Enter to close..." "$exit_code"; read _; exit "$exit_code"`],
  },
  {
    name: 'kitty',
    executable: 'kitty',
    executablePaths: [
      '/Applications/kitty.app/Contents/MacOS/kitty',
      `${process.env.HOME ?? ''}/Applications/kitty.app/Contents/MacOS/kitty`,
    ],
    args: (cwd, binaryPath) => ['--directory', cwd, '--start-as', 'fullscreen', 'sh', '-lc', `${shellQuote(binaryPath)}; exit_code=$?; printf "\\nGascii exited with code %s. Press Enter to close..." "$exit_code"; read _; exit "$exit_code"`],
  },
];

export class GasciiTerminalLauncher {
  launch(cwd: string, binaryPath: string): string {
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
        return launcher.name;
      } catch (error) {
        logger.warn('terminal launch failed, trying next option', {
          terminal: launcher.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const scriptPath = join(cwd, 'run-gascii.command');
    const script = [
      '#!/bin/sh',
      `cd ${shellQuote(cwd)}`,
      shellQuote(binaryPath),
      'exit_code=$?',
      'printf "\\nGascii exited with code %s. Press Enter to close..." "$exit_code"',
      'read _',
      'exit "$exit_code"',
      '',
    ].join('\n');
    spawnSync('/bin/sh', ['-lc', `umask 077; printf "%s" ${shellQuote(script)} > ${shellQuote(scriptPath)}; chmod 700 ${shellQuote(scriptPath)}`], {
      stdio: 'ignore',
    });

    const result = spawnSync('open', ['-a', 'Terminal', scriptPath], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    if (result.status !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`;
      throw new Error(`Terminal launch failed: ${detail}`);
    }
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
        this.launchTerminalProcess(executable, ['-e', 'sh', '-lc', `cd ${shellQuote(cwd)} && ${shellQuote(binaryPath)}`]);
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
    const result = spawnSync('open', ['-na', appName, '--args', ...args], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    if (result.error) {
      throw new Error(`Ghostty launch failed: ${result.error.message}`);
    }

    if (result.status !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`;
      throw new Error(`Ghostty launch failed: ${detail}`);
    }
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

  private resolveExecutable(executable: string, executablePaths: string[]): string | null {
    for (const executablePath of executablePaths) {
      if (executablePath && existsSync(executablePath)) {
        return executablePath;
      }
    }

    const result = spawnSync('/bin/sh', ['-lc', `command -v ${shellQuote(executable)}`], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const resolved = result.stdout.trim();

    return result.status === 0 && resolved ? resolved : null;
  }
}

export const gasciiTerminalLauncher = new GasciiTerminalLauncher();
