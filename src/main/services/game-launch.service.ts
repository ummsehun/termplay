import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { platform, tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { GAME_DEFINITIONS, type GameId } from '@shared/games';
import { createLogger } from '@shared/logger';

const logger = createLogger('game-launch-service');

export type LaunchResult = {
  ok: true;
  gameId: GameId;
  command: string;
  terminal: string;
  runId: string;
};

export type GameExitEvent = {
  gameId: GameId;
  exitCode: number | null;
};

export type GameExitListener = (event: GameExitEvent) => void;

type TerminalLauncher = {
  name: string;
  appName: string;
  executable: string;
  executablePaths: string[];
  args: (cwd: string, commandText: string) => string[];
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
    args: (cwd, commandText) => [`--working-directory=${cwd}`, '-e', 'sh', '-lc', commandText],
  },
  {
    name: 'kitty',
    appName: 'kitty',
    executable: 'kitty',
    executablePaths: [
      '/Applications/kitty.app/Contents/MacOS/kitty',
      `${process.env.HOME ?? ''}/Applications/kitty.app/Contents/MacOS/kitty`,
    ],
    args: (cwd, commandText) => ['--directory', cwd, '--start-as', 'fullscreen', 'sh', '-lc', commandText],
  },
];

type MacTerminalLaunch = {
  terminal: string;
  process?: ChildProcess;
};

export class GameLaunchService {
  constructor(private readonly onGameExit?: GameExitListener) {}

  launch(gameId: GameId): LaunchResult {
    const game = GAME_DEFINITIONS[gameId];

    if (!existsSync(game.workingDirectory)) {
      throw new Error(`게임 디렉터리를 찾을 수 없습니다: ${game.workingDirectory}`);
    }

    const runId = randomUUID();
    const statusFile = join(tmpdir(), `launcher-${gameId}-${runId}.status`);
    const commandText = this.buildCommandText(game.workingDirectory, game.command, game.args);
    const terminalCommandText = this.buildTrackedCommandText(game.workingDirectory, game.command, game.args, statusFile);

    const macTerminalLaunch =
      platform() === 'darwin' ? this.launchInPreferredMacTerminal(game.workingDirectory, terminalCommandText) : 'shell';

    if (platform() !== 'darwin') {
      this.launchInShell(game.workingDirectory, game.command, game.args, statusFile);
    }

    const terminal = typeof macTerminalLaunch === 'string' ? macTerminalLaunch : macTerminalLaunch.terminal;
    this.watchExitStatus(gameId, statusFile, typeof macTerminalLaunch === 'string' ? undefined : macTerminalLaunch.process);

    logger.info('launch requested', { gameId, commandText, terminal, runId });

    return {
      ok: true,
      gameId,
      command: commandText,
      terminal,
      runId,
    };
  }

  private buildCommandText(cwd: string, command: string, args: string[]): string {
    return `cd ${this.shellQuote(cwd)} && ${[command, ...args].map((part) => this.shellQuote(part)).join(' ')}`;
  }

  private buildTrackedCommandText(cwd: string, command: string, args: string[], statusFile: string): string {
    const quotedStatusFile = this.shellQuote(statusFile);
    const executable = [command, ...args].map((part) => this.shellQuote(part)).join(' ');

    return [
      `trap 'launcher_exit=$?; printf "%s" "$launcher_exit" > ${quotedStatusFile}' EXIT`,
      `cd ${this.shellQuote(cwd)}`,
      executable,
    ].join('; ');
  }

  private launchInPreferredMacTerminal(cwd: string, commandText: string): MacTerminalLaunch {
    for (const launcher of MAC_TERMINAL_PRIORITY) {
      const args = launcher.args(cwd, commandText);
      const executable = this.resolveExecutable(launcher);

      if (executable) {
        try {
          const process = this.launchTerminalProcess(executable, args);
          this.requestMacFullscreen(launcher.appName);
          return {
            terminal: launcher.name,
            process,
          };
        } catch (error) {
          logger.warn('terminal CLI launch failed, trying next option', {
            terminal: launcher.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info('terminal unavailable', { terminal: launcher.name });
    }

    this.launchInMacTerminal(commandText);
    this.requestMacFullscreen('Terminal');
    return {
      terminal: 'Terminal',
    };
  }

  private launchInMacTerminal(commandText: string): void {
    const escapedCommand = commandText.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const script = `tell application "Terminal" to do script "${escapedCommand}"`;

    const result = spawnSync('osascript', ['-e', script], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    if (result.error) {
      throw new Error(`Terminal 실행 실패: ${result.error.message}`);
    }

    if (result.status !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`;
      throw new Error(`Terminal 실행 실패: ${detail}`);
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

  private launchInShell(cwd: string, command: string, args: string[], statusFile: string): void {
    try {
      const child = spawn(command, args, {
        cwd,
        detached: true,
        stdio: 'inherit',
      });

      child.on('error', (error) => {
        logger.error('child process failed after launch', error);
      });

      child.on('exit', (code) => {
        this.writeExitStatus(statusFile, code);
      });

      child.unref();
    } catch (error) {
      throw new Error(`프로세스 실행 실패: ${error instanceof Error ? error.message : String(error)}`);
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

  private watchExitStatus(gameId: GameId, statusFile: string, terminalProcess?: ChildProcess): void {
    let isSettled = false;
    const startedAt = Date.now();
    const timeoutMs = 12 * 60 * 60 * 1000;
    const finish = (exitCode: number | null, source: 'terminal-process' | 'status-file' | 'timeout') => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearInterval(interval);
      this.removeStatusFile(statusFile);
      logger.info('game process finished', { gameId, exitCode, source });
      this.onGameExit?.({ gameId, exitCode });
    };

    const interval = setInterval(() => {
      if (Date.now() - startedAt > timeoutMs) {
        logger.warn('game exit watcher timed out', { gameId, statusFile });
        finish(null, 'timeout');
        return;
      }

      if (terminalProcess) {
        return;
      }

      if (!existsSync(statusFile)) {
        return;
      }

      const rawExitCode = readFileSync(statusFile, 'utf8').trim();
      const parsedExitCode = Number.parseInt(rawExitCode, 10);
      const exitCode = Number.isFinite(parsedExitCode) ? parsedExitCode : null;

      finish(exitCode, 'status-file');
    }, 800);

    terminalProcess?.once('exit', (code) => {
      finish(code, 'terminal-process');
    });

    terminalProcess?.once('error', (error) => {
      logger.error('terminal process watcher failed', error);
      finish(null, 'terminal-process');
    });

    interval.unref();
  }

  private writeExitStatus(statusFile: string, code: number | null): void {
    spawnSync('/bin/sh', ['-lc', `printf "%s" ${this.shellQuote(String(code ?? 0))} > ${this.shellQuote(statusFile)}`], {
      stdio: 'ignore',
    });
  }

  private removeStatusFile(statusFile: string): void {
    try {
      unlinkSync(statusFile);
    } catch {
      // 이미 삭제됐으면 무시한다.
    }
  }

  private shellQuote(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`;
  }

  private resolveExecutable(launcher: TerminalLauncher): string | null {
    for (const executablePath of launcher.executablePaths) {
      if (executablePath && existsSync(executablePath)) {
        return executablePath;
      }
    }

    const result = spawnSync('/bin/sh', ['-lc', `command -v ${this.shellQuote(launcher.executable)}`], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const executable = result.stdout.trim();

    return result.status === 0 && executable ? executable : null;
  }
}
