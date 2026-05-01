import { app, BrowserWindow, dialog } from 'electron';
import { createMainWindow } from './core/create-window';
import { registerGameHandlers } from './handler/game.handler';
import { registerLauncherHandlers } from './handler/launcher.handler';
import { registerSeriesHandlers } from './handler/series.handler';
import { toErrorMessage } from './utils/error';

app.setName('TermPlay');

const showFatalError = (title: string, error: unknown): void => {
  const message = toErrorMessage(error);
  console.error(`[launcher:fatal] ${title}`, error);

  if (app.isReady()) {
    void dialog.showMessageBox({
      type: 'error',
      title,
      message,
    });
  }
};

process.on('uncaughtException', (error) => {
  showFatalError('처리되지 않은 예외', error);
});

process.on('unhandledRejection', (reason) => {
  showFatalError('처리되지 않은 비동기 예외', reason);
});

try {
  registerGameHandlers();
  registerLauncherHandlers();
  registerSeriesHandlers();
} catch (error) {
  showFatalError('IPC 핸들러 등록 실패', error);
  app.quit();
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];

    if (!window) {
      return;
    }

    if (window.isMinimized()) {
      window.restore();
    }

    window.focus();
  });

  void app
    .whenReady()
    .then(() => {
      createMainWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createMainWindow();
        }
      });
    })
    .catch((error: unknown) => {
      showFatalError('앱 초기화 실패', error);
      app.quit();
    });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
