import type { GameId } from '@shared/games';

type LaunchResult =
  | {
      ok: true;
      gameId: GameId;
      command: string;
    }
  | {
      ok: false;
      error: string;
    };

declare global {
  interface Window {
    launcher: {
      launchGame: (gameId: GameId) => Promise<LaunchResult>;
    };
  }
}

export {};
