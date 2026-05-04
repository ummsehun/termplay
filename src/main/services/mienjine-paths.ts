import { join } from 'node:path';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';
import { SERIES_DEFINITIONS } from './series-definitions';

export const MIENJINE_ASSET_DIRS = SERIES_DEFINITIONS.mienjine.libraryDirs;

export const getMienjineStartScriptPath = (installPath: string): string => join(installPath, 'start.sh');

export const resolveMienjineInstallPath = async (): Promise<string> => {
  const config = await launcherConfigRepo.getConfig();
  return config.series.mienjine.installPath || join(launcherConfigRepo.getTermRoot(), SERIES_DEFINITIONS.mienjine.installDirName);
};
