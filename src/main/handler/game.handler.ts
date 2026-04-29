import { BrowserWindow, ipcMain } from 'electron';
import { gameIdSchema } from '@shared/games';
import { IPC_CHANNELS } from '@shared/ipc';
import { createLogger } from '@shared/logger';
import { GameManager } from '../manager/game.manager';
import { GameLaunchService } from '../services/game-launch.service';
import { toErrorMessage } from '../utils/error';

const logger = createLogger('game-handler');

const createDefaultGameManager = (): GameManager => {
  const gameLaunchService = new GameLaunchService(({ gameId, exitCode }) => {
    const message =
      exitCode === 0 || exitCode === null
        ? `${gameId} 실행이 종료되었습니다.`
        : `${gameId} 실행이 종료되었습니다. 종료 코드: ${exitCode}`;

    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IPC_CHANNELS.gameStatusChanged, {
        gameId,
        status: 'READY_TO_PLAY',
        message,
      });
    }
  });

  return new GameManager(gameLaunchService);
};

export const registerGameHandlers = (gameManager = createDefaultGameManager()): void => {
  ipcMain.handle(IPC_CHANNELS.launchGame, async (_event, payload: unknown) => {
    const parsedGameId = gameIdSchema.safeParse(payload);

    if (!parsedGameId.success) {
      return {
        ok: false,
        error: '알 수 없는 게임 실행 요청입니다.',
      };
    }

    try {
      return gameManager.launch(parsedGameId.data);
    } catch (error) {
      logger.error('launch failed', error);
      return {
        ok: false,
        error: toErrorMessage(error),
      };
    }
  });
};
