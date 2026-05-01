import { app, type BrowserWindow, shell } from 'electron';

const ALLOWED_DEV_RENDERER_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const ALLOWED_EXTERNAL_HOSTS = new Set(['github.com', 'www.github.com']);

export const isAllowedDevRendererUrl = (value: string): boolean => {
  if (app.isPackaged) {
    return false;
  }

  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && ALLOWED_DEV_RENDERER_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
};

export const isAllowedExternalUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ALLOWED_EXTERNAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
};

export const openAllowedExternalUrl = async (url: string): Promise<void> => {
  if (!isAllowedExternalUrl(url)) {
    throw new Error('External URL is not allowed');
  }

  await shell.openExternal(url);
};

export const configureWindowSecurity = (window: BrowserWindow): void => {
  window.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedDevRendererUrl(url)) {
      event.preventDefault();
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      void openAllowedExternalUrl(url);
    }

    return { action: 'deny' };
  });
};
