import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { join } from 'node:path';
import { type MienjineInstallInfo, type SeriesVerifyResult } from '@shared/launcherTypes';
import { getMienjineStartScriptPath, MIENJINE_ASSET_DIRS } from './mienjine-paths';
import { SERIES_DEFINITIONS } from './series-definitions';

export class MienjineIntegrityService {
  async verify(installed: MienjineInstallInfo | null | undefined): Promise<SeriesVerifyResult> {
    if (!installed) {
      return {
        seriesId: 'mienjine',
        ok: false,
        checkedPaths: [],
        missing: ['Mienjine installation'],
        message: 'Mienjine is not installed',
      };
    }

    const assetPaths = MIENJINE_ASSET_DIRS.map((dir) => join(installed.installPath, 'assets', dir));
    const checkedPaths = [installed.installPath, installed.binaryPath, ...assetPaths];
    const missing = [installed.installPath, installed.binaryPath].filter((checkedPath) => !existsSync(checkedPath));
    const missingRequiredGroups = await this.getMissingRequiredAssetGroups(installed.installPath);
    for (const missingGroup of missingRequiredGroups) {
      missing.push(`assets/${missingGroup.join(' or assets/')}`);
    }

    return {
      seriesId: 'mienjine',
      ok: missing.length === 0,
      checkedPaths,
      missing,
      message: missing.length === 0 ? 'Mienjine integrity check passed' : 'Mienjine integrity check found missing files',
    };
  }

  async ensureReady(installPath: string): Promise<void> {
    const startScriptPath = getMienjineStartScriptPath(installPath);
    await fs.access(startScriptPath, fs.constants.X_OK);
    await Promise.all(MIENJINE_ASSET_DIRS.map((dir) => fs.mkdir(join(installPath, 'assets', dir), { recursive: true })));

    const missingRequiredGroups = await this.getMissingRequiredAssetGroups(installPath);
    if (missingRequiredGroups.length > 0) {
      const requirements = missingRequiredGroups
        .map((group) => group.map((dir) => `assets/${dir}`).join(' or '))
        .join(', ');
      throw new Error(`Mienjine assets are missing. Add at least one file to ${requirements}.`);
    }
  }

  private async getMissingRequiredAssetGroups(installPath: string): Promise<Array<readonly string[]>> {
    const missingGroups: Array<readonly string[]> = [];

    for (const group of SERIES_DEFINITIONS.mienjine.requiredAssetGroups) {
      const hasAnyRequiredAsset = await Promise.any(
        group.map(async (dir) => {
          if (await this.hasFiles(join(installPath, 'assets', dir))) {
            return true;
          }

          throw new Error(`No files in ${dir}`);
        }),
      ).catch(() => false);

      if (!hasAnyRequiredAsset) {
        missingGroups.push(group);
      }
    }

    return missingGroups;
  }

  private async hasFiles(directoryPath: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });
      return entries.some((entry) => entry.isFile());
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return false;
      }

      throw error;
    }
  }
}

export const mienjineIntegrityService = new MienjineIntegrityService();
