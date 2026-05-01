import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, nativeTheme } from 'electron';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export const createSplashWindow = (): BrowserWindow => {
  const splashWindow = new BrowserWindow({
    width: 960,
    height: 540,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'TermPlay',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#050505' : '#ffffff',
    show: false,
    webPreferences: {
      preload: join(currentDirectory, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    const url = new URL(process.env.ELECTRON_RENDERER_URL);
    url.searchParams.set('view', 'splash');
    void splashWindow.loadURL(url.toString());
  } else {
    void splashWindow.loadFile(join(currentDirectory, '../renderer/index.html'), {
      query: { view: 'splash' },
    });
  }

  return splashWindow;
};
