import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '@shared/logger';
import { LauncherConfig, TerminalSeriesId, LauncherSettingKey } from '@shared/launcherTypes';

const logger = createLogger('launcher-config-repo');

const DEFAULT_CONFIG: LauncherConfig = {
  version: 1,
  global: {
    language: 'ko',
    autoUpdate: true,
  },
  series: {
    gascii: {
      installPath: '',
      options: {
        hwAccel: true,
        autoClean: true,
      }
    },
    mienjine: {
      installPath: '',
      options: {
        highRes: true,
        physics: true,
      }
    }
  }
};

export class LauncherConfigRepository {
  private get configPath(): string {
    return path.join(app.getPath('userData'), 'launcher-config.json');
  }

  async ensureDefaultConfig(): Promise<void> {
    try {
      await fs.access(this.configPath);
    } catch {
      logger.info('Config file not found, creating default config.');
      await this.saveConfig(DEFAULT_CONFIG);
    }
  }

  async getConfig(): Promise<LauncherConfig> {
    await this.ensureDefaultConfig();
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(data) as LauncherConfig;
      // Basic validation/migration could be added here
      return {
        ...DEFAULT_CONFIG,
        ...config,
        global: {
          ...DEFAULT_CONFIG.global,
          ...(config.global || {})
        },
        series: {
          gascii: {
            ...DEFAULT_CONFIG.series.gascii,
            ...(config.series?.gascii || {})
          },
          mienjine: {
            ...DEFAULT_CONFIG.series.mienjine,
            ...(config.series?.mienjine || {})
          }
        }
      };
    } catch (error) {
      logger.error('Failed to read config, returning default', error);
      return DEFAULT_CONFIG;
    }
  }

  async saveConfig(config: LauncherConfig): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      logger.error('Failed to save config', error);
      throw error;
    }
  }
}

export const launcherConfigRepo = new LauncherConfigRepository();
