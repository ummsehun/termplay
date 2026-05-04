import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';
import { createLogger } from '@shared/logger';
import { SERIES_DEFINITIONS } from './series-definitions';
import { createSeriesLaunchCommand } from './series-launch-security';

const logger = createLogger('gascii-terminal-launcher');

type TerminalLauncher = {
  name: string;
  executable: string;
  executablePaths: string[];
  args: (cwd: string, commandText: string) => string[];
  appName?: string;
};

const shellQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;
const wrapCommand = (commandText: string): string =>
  `${commandText}; exit_code=$?; printf "\\nGascii exited with code %s. Press Enter to close..." "$exit_code"; read _; exit "$exit_code"`;

const MAC_TERMINAL_PRIORITY: TerminalLauncher[] = [
  {
    name: 'Ghostty',
    executable: 'ghostty',
    executablePaths: [
      '/Applications/Ghostty.app/Contents/MacOS/ghostty',
      `${process.env.HOME ?? ''}/Applications/Ghostty.app/Contents/MacOS/ghostty`,
    ],
    appName: 'Ghostty.app',
    args: (cwd, commandText) => [`--working-directory=${cwd}`, '-e', 'sh', '-lc', wrapCommand(commandText)],
  },
  {
    name: 'Terminal',
    executable: 'open',
    executablePaths: ['/usr/bin/open'],
    args: () => [],
  },
  {
    name: 'kitty',
    executable: 'kitty',
    executablePaths: [
      '/Applications/kitty.app/Contents/MacOS/kitty',
      `${process.env.HOME ?? ''}/Applications/kitty.app/Contents/MacOS/kitty`,
    ],
    args: (cwd, commandText) => ['--directory', cwd, '--start-as', 'fullscreen', 'sh', '-lc', wrapCommand(commandText)],
  },
];

export class GasciiTerminalLauncher {
  launch(cwd: string, binaryPath: string): string {
    const launchCommand = createSeriesLaunchCommand(SERIES_DEFINITIONS.gascii, cwd, binaryPath);

    if (platform() === 'darwin') {
      return this.launchInMacTerminalPriority(cwd, launchCommand.commandText, launchCommand.label);
    }

    return this.launchInLinuxTerminal(cwd, launchCommand.commandText, launchCommand.label);
  }

  private launchInMacTerminalPriority(cwd: string, commandText: string, sandboxLabel: string): string {
    for (const launcher of MAC_TERMINAL_PRIORITY) {
      const executable = this.resolveExecutable(launcher.executable, launcher.executablePaths);
      if (!executable) {
        logger.info('terminal unavailable', { terminal: launcher.name });
        continue;
      }

      try {
        if (launcher.name === 'Terminal') {
          this.launchDefaultTerminal(cwd, commandText);
          this.requestMacFullscreen('Terminal');
        } else if (launcher.appName) {
          this.launchMacAppWithArgs(launcher.appName, launcher.args(cwd, commandText));
          this.requestMacFullscreen(launcher.name === 'Ghostty' ? 'Ghostty' : launcher.name);
        } else {
          this.launchTerminalProcess(executable, launcher.args(cwd, commandText));
          this.requestMacFullscreen(launcher.name);
        }
        return `${launcher.name} (${sandboxLabel})`;
      } catch (error) {
        logger.warn('terminal launch failed, trying next option', {
          terminal: launcher.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    throw new Error('No supported macOS terminal was found');
  }

  private launchDefaultTerminal(cwd: string, commandText: string): void {
    const scriptPath = join(cwd, 'run-gascii.command');
    const script = [
      '#!/bin/sh',
      `cd ${shellQuote(cwd)}`,
      commandText,
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
  }

  private launchInLinuxTerminal(cwd: string, commandText: string, sandboxLabel: string): string {
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
        this.launchTerminalProcess(executable, ['-e', 'sh', '-lc', commandText]);
        return `${terminal} (${sandboxLabel})`;
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
      throw new Error(`${appName} launch failed: ${result.error.message}`);
    }

    if (result.status !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`;
      throw new Error(`${appName} launch failed: ${detail}`);
    }
  }

  private requestMacFullscreen(appName: string): void {
    const script = [
      `tell application "${appName}" to activate`,
      'delay 0.35',
      'tell application "System Events" to keystroke "f" using {control down, command down}',
    ].join('\n');

    const result = spawnSync('osascript', ['-e', script], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    if (result.status !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim();
      logger.warn('fullscreen request failed', { terminal: appName, detail });
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
