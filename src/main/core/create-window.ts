import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow } from 'electron';
import { configureWindowSecurity, isAllowedDevRendererUrl } from './window-security';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export const createMainWindow = (): BrowserWindow => {
  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    title: 'TermPlay',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: join(currentDirectory, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  configureWindowSecurity(mainWindow);

  if (process.env.ELECTRON_RENDERER_URL && isAllowedDevRendererUrl(process.env.ELECTRON_RENDERER_URL)) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(currentDirectory, '../renderer/index.html'));
  }

  return mainWindow;
};
