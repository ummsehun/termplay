import { contextBridge, ipcRenderer } from 'electron';
import { gameIdSchema, type GameId } from '@shared/games';
import { IPC_CHANNELS } from '@shared/ipc';

contextBridge.exposeInMainWorld('launcher', {
  launchGame: (gameId: GameId) => ipcRenderer.invoke(IPC_CHANNELS.launchGame, gameIdSchema.parse(gameId)),
  onGameStatusChanged: (callback: (event: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.gameStatusChanged, listener);

    return () => {
      ipcRenderer.off(IPC_CHANNELS.gameStatusChanged, listener);
    };
  },
});
