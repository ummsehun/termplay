import { app } from 'electron';
import path from 'path';
import ElectronStore from 'electron-store';
import { createLogger } from '@shared/logger';
import { GasciiInstallInfo, LauncherConfig, SeriesRuntimeState } from '@shared/launcherTypes';

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

type TermPlayStoreSchema = {
  config: LauncherConfig;
  runtime: SeriesRuntimeState;
};

export class LauncherConfigRepository {
  private store: ElectronStore<TermPlayStoreSchema> | null = null;

  private getStore(): ElectronStore<TermPlayStoreSchema> {
    if (!this.store) {
      this.store = new ElectronStore<TermPlayStoreSchema>({
        name: 'termplay',
        defaults: {
          config: DEFAULT_CONFIG,
          runtime: {},
        },
      });
    }

    return this.store;
  }

  getTermRoot(): string {
    return path.join(app.getPath('userData'), 'Term');
  }

  async ensureDefaultConfig(): Promise<void> {
    const store = this.getStore();

    if (!store.has('config')) {
      logger.info('Config not found, creating default config.');
      store.set('config', DEFAULT_CONFIG);
    }

    if (!store.has('runtime')) {
      store.set('runtime', {});
    }
  }

  async getConfig(): Promise<LauncherConfig> {
    await this.ensureDefaultConfig();
    try {
      const config = this.getStore().get('config', DEFAULT_CONFIG);
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
      this.getStore().set('config', config);
    } catch (error) {
      logger.error('Failed to save config', error);
      throw error;
    }
  }

  async getGasciiInstallInfo(): Promise<GasciiInstallInfo | null> {
    await this.ensureDefaultConfig();
    return this.getStore().get('runtime.gascii') ?? null;
  }

  async setGasciiInstallInfo(info: GasciiInstallInfo): Promise<void> {
    await this.ensureDefaultConfig();
    this.getStore().set('runtime.gascii', info);
  }
}

export const launcherConfigRepo = new LauncherConfigRepository();
