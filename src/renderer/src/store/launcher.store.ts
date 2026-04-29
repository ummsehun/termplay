import { create } from 'zustand';
import type { GameId } from '@shared/games';

type LaunchStatus = 'idle' | 'launching' | 'success' | 'error';

type LauncherState = {
  activeGameId: GameId | null;
  status: LaunchStatus;
  message: string;
  launchGame: (gameId: GameId) => Promise<void>;
};

export const useLauncherStore = create<LauncherState>((set) => ({
  activeGameId: null,
  status: 'idle',
  message: '대기 중',
  launchGame: async (gameId) => {
    set({ activeGameId: gameId, status: 'launching', message: '터미널 실행 중' });

    try {
      const result = await window.launcher.launchGame(gameId);

      if (!result.ok) {
        set({
          activeGameId: gameId,
          status: 'error',
          message: result.error,
        });
        return;
      }

      set({
        activeGameId: result.gameId,
        status: 'success',
        message: `${result.command} 실행 요청 완료`,
      });
    } catch (error) {
      set({
        activeGameId: gameId,
        status: 'error',
        message: error instanceof Error ? error.message : '실행 중 알 수 없는 오류가 발생했습니다.',
      });
    }
  },
}));
