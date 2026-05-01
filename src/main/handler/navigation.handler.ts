import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc';
import { openExternalRequestSchema } from '@shared/launcherSchemas';
import { createLogger } from '@shared/logger';
import { openAllowedExternalUrl } from '../core/window-security';
import { toErrorMessage } from '../utils/error';

const logger = createLogger('navigation-handler');

export const registerNavigationHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.navigation.openExternal, async (_event, payload: unknown) => {
    const parsed = openExternalRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid request' };
    }

    try {
      await openAllowedExternalUrl(parsed.data.url);
      return { ok: true, data: null };
    } catch (error) {
      logger.warn('openExternal blocked or failed', error);
      return { ok: false, error: toErrorMessage(error) };
    }
  });
};
