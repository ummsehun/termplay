import { create } from 'zustand';
import { TerminalSeriesId, LauncherSettingKey } from '../../terminal-series/constants/seriesFeatureConfig';

export type Language = 'ko' | 'en' | 'ja';

type LauncherConfigState = {
  global: {
    language: Language;
    autoUpdate: boolean;
  };
  series: Record<TerminalSeriesId, {
    installPath: string;
    options: Partial<Record<LauncherSettingKey, boolean>>;
  }>;
  setLanguage: (language: Language) => Promise<void>;
  setAutoUpdate: (enabled: boolean) => Promise<void>;
  setSeriesOption: (seriesId: TerminalSeriesId, key: LauncherSettingKey, value: boolean) => Promise<void>;
  setInstallPath: (seriesId: TerminalSeriesId, path: string) => Promise<void>;
};

const initialState = {
  global: {
    language: 'ko' as Language,
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
      installPath: 'C:\\Program Files\\Lanchaer\\mienjine',
      options: {
        highRes: true,
        physics: true,
      }
    }
  }
};

export const useLauncherConfigStore = create<LauncherConfigState & { load: () => Promise<void> }>((set, get) => ({
  ...initialState,
  
  load: async () => {
    try {
      const result = await window.launcher.settings.get();
      if (result.ok) {
        set((state) => ({
          global: { ...state.global, ...result.data.global },
          series: {
            gascii: { ...state.series.gascii, ...(result.data.series.gascii || {}) },
            mienjine: { ...state.series.mienjine, ...(result.data.series.mienjine || {}) }
          }
        }));
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  },

  setLanguage: async (language) => {
    const previous = get().global.language;
    set((state) => ({ global: { ...state.global, language } }));
    try {
      const result = await window.launcher.settings.setGlobalOption('language', language);
      if (!result.ok) throw new Error(result.error);
    } catch (e) {
      console.error('Failed to set language', e);
      set((state) => ({ global: { ...state.global, language: previous } }));
    }
  },
  
  setAutoUpdate: async (autoUpdate) => {
    const previous = get().global.autoUpdate;
    set((state) => ({ global: { ...state.global, autoUpdate } }));
    try {
      const result = await window.launcher.settings.setGlobalOption('autoUpdate', autoUpdate);
      if (!result.ok) throw new Error(result.error);
    } catch (e) {
      console.error('Failed to set autoUpdate', e);
      set((state) => ({ global: { ...state.global, autoUpdate: previous } }));
    }
  },

  setSeriesOption: async (seriesId, key, value) => {
    const previousState = get().series[seriesId]?.options[key];
    set((state) => ({
      series: {
        ...state.series,
        [seriesId]: {
          ...state.series[seriesId],
          options: {
            ...state.series[seriesId].options,
            [key]: value
          }
        }
      }
    }));

    try {
      const result = await window.launcher.settings.setSeriesOption(seriesId, key, value);
      if (!result.ok) {
        throw new Error(result.error);
      }
    } catch (e) {
      console.error('Failed to set series option', e);
      if (previousState !== undefined) {
        set((state) => ({
          series: {
            ...state.series,
            [seriesId]: {
              ...state.series[seriesId],
              options: {
                ...state.series[seriesId].options,
                [key]: previousState
              }
            }
          }
        }));
      }
    }
  },

  setInstallPath: async (seriesId, path) => {
    const previous = get().series[seriesId]?.installPath;
    set((state) => ({
      series: {
        ...state.series,
        [seriesId]: {
          ...state.series[seriesId],
          installPath: path
        }
      }
    }));
    try {
      const result = await window.launcher.settings.setInstallPath(seriesId, path);
      if (!result.ok) throw new Error(result.error);
    } catch (e) {
      console.error('Failed to set installPath', e);
      set((state) => ({
        series: {
          ...state.series,
          [seriesId]: {
            ...state.series[seriesId],
            installPath: previous || ''
          }
        }
      }));
      throw e;
    }
  }
}));
