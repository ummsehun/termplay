import { contextBridge, ipcRenderer } from 'electron';
import { gameIdSchema, type GameId } from '@shared/games';
import { IPC_CHANNELS } from '@shared/ipc';

contextBridge.exposeInMainWorld('launcher', {
  launchGame: (gameId: GameId) => ipcRenderer.invoke(IPC_CHANNELS.launchGame, gameIdSchema.parse(gameId)),
});
