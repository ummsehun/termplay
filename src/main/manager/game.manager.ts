import { type GameId } from '@shared/games';
import { GameLaunchService, type LaunchResult } from '../services/game-launch.service';

export class GameManager {
  constructor(private readonly gameLaunchService = new GameLaunchService()) {}

  launch(gameId: GameId): LaunchResult {
    return this.gameLaunchService.launch(gameId);
  }
}
