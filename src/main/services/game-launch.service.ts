import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { GAME_DEFINITIONS, type GameId } from '@shared/games';
import { createLogger } from '@shared/logger';

const logger = createLogger('game-launch-service');

export type LaunchResult = {
  ok: true;
  gameId: GameId;
  command: string;
};

export class GameLaunchService {
  launch(gameId: GameId): LaunchResult {
    const game = GAME_DEFINITIONS[gameId];

    if (!existsSync(game.workingDirectory)) {
      throw new Error(`게임 디렉터리를 찾을 수 없습니다: ${game.workingDirectory}`);
    }

    const commandText = this.buildCommandText(game.workingDirectory, game.command, game.args);

    if (platform() === 'darwin') {
      this.launchInMacTerminal(commandText);
    } else {
      this.launchInShell(game.workingDirectory, game.command, game.args);
    }

    logger.info('launch requested', { gameId, commandText });

    return {
      ok: true,
      gameId,
      command: commandText,
    };
  }

  private buildCommandText(cwd: string, command: string, args: string[]): string {
    return `cd ${this.shellQuote(cwd)} && ${[command, ...args].map((part) => this.shellQuote(part)).join(' ')}`;
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

  private launchInShell(cwd: string, command: string, args: string[]): void {
    try {
      const child = spawn(command, args, {
        cwd,
        detached: true,
        stdio: 'inherit',
        shell: true,
      });

      child.on('error', (error) => {
        logger.error('child process failed after launch', error);
      });

      child.unref();
    } catch (error) {
      throw new Error(`프로세스 실행 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private shellQuote(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`;
  }
}
