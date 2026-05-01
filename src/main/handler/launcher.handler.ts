import { registerAssetHandlers } from './asset.handler';
import { registerLibraryHandlers } from './library.handler';
import { registerMediaDownloadHandlers } from './media-download.handler';
import { registerSettingsHandlers } from './settings.handler';

export const registerLauncherHandlers = (): void => {
  registerSettingsHandlers();
  registerLibraryHandlers();
  registerAssetHandlers();
  registerMediaDownloadHandlers();
};
