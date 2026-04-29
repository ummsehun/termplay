import type { GameId, GameStatus } from '@shared/games';

type LaunchResult =
  | {
      ok: true;
      gameId: GameId;
      command: string;
      terminal: string;
      runId: string;
    }
  | {
      ok: false;
      error: string;
    };

declare global {
  interface Window {
    launcher: {
      launchGame: (gameId: GameId) => Promise<LaunchResult>;
      onGameStatusChanged: (
        callback: (event: { gameId: GameId; status: GameStatus; message: string }) => void,
      ) => () => void;
    };
  }
}

export {};
