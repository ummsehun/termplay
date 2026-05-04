import { join } from 'node:path';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';

export const MIENJINE_ASSET_DIRS = ['backup', 'camera', 'glb', 'music', 'pmx', 'stage', 'sync', 'vmd'] as const;

export const getMienjineStartScriptPath = (installPath: string): string => join(installPath, 'start.sh');

export const resolveMienjineInstallPath = async (): Promise<string> => {
  const config = await launcherConfigRepo.getConfig();
  return config.series.mienjine.installPath || join(launcherConfigRepo.getTermRoot(), 'mienjine');
};
