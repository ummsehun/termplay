import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { join } from 'node:path';
import { type MienjineInstallInfo, type SeriesVerifyResult } from '@shared/launcherTypes';
import { getMienjineStartScriptPath, MIENJINE_ASSET_DIRS } from './mienjine-paths';

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
    const hasRenderableModel = await this.hasFiles(join(installed.installPath, 'assets', 'glb')) ||
      await this.hasFiles(join(installed.installPath, 'assets', 'pmx'));

    if (!hasRenderableModel) {
      missing.push('assets/glb or assets/pmx');
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

    const hasRenderableModel = await this.hasFiles(join(installPath, 'assets', 'glb')) ||
      await this.hasFiles(join(installPath, 'assets', 'pmx'));

    if (!hasRenderableModel) {
      throw new Error('Mienjine assets are missing. Add at least one file to assets/glb or assets/pmx.');
    }
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
