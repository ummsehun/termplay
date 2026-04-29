import { create } from 'zustand';
import { GAME_DEFINITIONS, type GameId, type GameStatus } from '@shared/games';

type GameStatusMap = Record<GameId, GameStatus>;

type LauncherState = {
  selectedGameId: GameId;
  statuses: GameStatusMap;
  message: string;
  selectGame: (gameId: GameId) => void;
  launchGame: (gameId: GameId) => Promise<void>;
  repairGame: (gameId: GameId) => void;
  updateGameStatus: (event: { gameId: GameId; status: GameStatus; message: string }) => void;
};

const initialStatuses = Object.values(GAME_DEFINITIONS).reduce<GameStatusMap>((statuses, game) => {
  statuses[game.id] = 'READY_TO_PLAY';
  return statuses;
}, {} as GameStatusMap);

export const useLauncherStore = create<LauncherState>((set) => ({
  selectedGameId: 'miku',
  statuses: initialStatuses,
  message: '런처 준비 완료',
  selectGame: (gameId) => {
    set({ selectedGameId: gameId, message: `${GAME_DEFINITIONS[gameId].title} 선택됨` });
  },
  launchGame: async (gameId) => {
    const game = GAME_DEFINITIONS[gameId];

    if (useLauncherStore.getState().statuses[gameId] === 'RUNNING') {
      set({ message: `${game.title}은 이미 실행 중입니다.` });
      return;
    }

    set((state) => ({
      statuses: {
        ...state.statuses,
        [gameId]: 'RUNNING',
      },
      message: `${game.title} 실행 요청 중`,
    }));

    try {
      const result = await window.launcher.launchGame(gameId);

      if (!result.ok) {
        set((state) => ({
          statuses: {
            ...state.statuses,
            [gameId]: 'ERROR',
          },
          message: result.error,
        }));
        return;
      }

      set((state) => ({
        statuses: {
          ...state.statuses,
          [result.gameId]: 'RUNNING',
        },
        message: `${result.terminal} 전체화면에서 실행 중: ${result.command}`,
      }));
    } catch (error) {
      set((state) => ({
        statuses: {
          ...state.statuses,
          [gameId]: 'ERROR',
        },
        message: error instanceof Error ? error.message : '실행 중 알 수 없는 오류가 발생했습니다.',
      }));
    }
  },
  repairGame: (gameId) => {
    set((state) => ({
      statuses: {
        ...state.statuses,
        [gameId]: 'VERIFYING',
      },
      message: `${GAME_DEFINITIONS[gameId].title} 복구 검사는 v0.2에서 manifest 기반으로 연결됩니다.`,
    }));

    window.setTimeout(() => {
      set((state) => ({
        statuses: {
          ...state.statuses,
          [gameId]: 'READY_TO_PLAY',
        },
        message: `${GAME_DEFINITIONS[gameId].title} mock 복구 완료`,
      }));
    }, 800);
  },
  updateGameStatus: ({ gameId, message, status }) => {
    set((state) => ({
      statuses: {
        ...state.statuses,
        [gameId]: status,
      },
      message,
    }));
  },
}));
