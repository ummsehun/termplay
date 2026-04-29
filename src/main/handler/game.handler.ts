import { ipcMain } from 'electron';
import { gameIdSchema } from '@shared/games';
import { IPC_CHANNELS } from '@shared/ipc';
import { createLogger } from '@shared/logger';
import { GameManager } from '../manager/game.manager';
import { toErrorMessage } from '../utils/error';

const logger = createLogger('game-handler');

export const registerGameHandlers = (gameManager = new GameManager()): void => {
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
