import { create } from 'zustand';
import { type TerminalSeriesId } from '@shared/launcherTypes';
import { TerminalSeries, TerminalSeriesTab, TerminalSeriesLog } from '../types/terminalSeriesTypes';
import { terminalSeriesApi } from '../api/terminalSeriesApi';
import { createSeriesLog, getErrorMessage, withAssetStatus } from './terminalSeriesStoreHelpers';

type TerminalSeriesState = {
  series: TerminalSeries[];
  selectedSeriesId: string | null;
  selectedTab: TerminalSeriesTab;
  isActionPending: boolean;
  isInitializing: boolean;
  error: string | null;
  actionProgressBySeries: Record<string, number>;

  // Actions
  initialize: () => Promise<void>;
  selectSeries: (id: string) => void;
  setSelectedTab: (tab: TerminalSeriesTab) => void;
  
  installSelectedSeries: () => Promise<void>;
  launchSelectedSeries: () => Promise<void>;
  updateSelectedSeries: () => Promise<void>;
  removeSelectedSeries: () => Promise<void>;
  verifySelectedSeries: () => Promise<void>;
  revealSelectedSeriesInstallDir: () => Promise<void>;

  // Internal helpers
  updateSeriesInStore: (id: string, updates: Partial<TerminalSeries>) => void;
  addLog: (id: string, log: Omit<TerminalSeriesLog, 'id' | 'timestamp'>) => void;
};

export const useTerminalSeriesStore = create<TerminalSeriesState>((set, get) => ({
  series: [],
  selectedSeriesId: null,
  selectedTab: 'overview',
  isActionPending: false,
  isInitializing: true,
  error: null,
  actionProgressBySeries: {},

  initialize: async () => {
    try {
      set({ isInitializing: true, error: null });
      const seriesList = await terminalSeriesApi.getSeriesList();
      set({ 
        series: seriesList, 
        selectedSeriesId: seriesList.length > 0 ? seriesList[0].id : null,
        isInitializing: false 
      });

      await Promise.all(seriesList.map(async (item) => {
        try {
          const statusResult = await window.launcher.series.getStatus(item.id as TerminalSeriesId);
          if (statusResult.ok) {
            get().updateSeriesInStore(item.id, {
              status: statusResult.data.status,
              installedVersion: statusResult.data.installedVersion,
              latestVersion: statusResult.data.latestVersion ?? item.latestVersion ?? 'unknown',
              installPath: statusResult.data.installPath,
            });
          }
        } catch {
          // 초기 목록 렌더링은 개별 시리즈 상태 조회 실패와 분리한다.
        }
      }));
    } catch (err) {
      set({ error: getErrorMessage(err, 'Failed to load series'), isInitializing: false });
    }
  },

  selectSeries: (id: string) => set({ selectedSeriesId: id }),
  setSelectedTab: (tab: TerminalSeriesTab) => set({ selectedTab: tab }),

  updateSeriesInStore: (id, updates) => set((state) => ({
    series: state.series.map(s => s.id === id ? { ...s, ...updates } : s)
  })),

  addLog: (id, logProps) => set((state) => {
    const newLog = createSeriesLog(logProps);
    return {
      series: state.series.map(s => s.id === id ? { ...s, logs: [...s.logs, newLog] } : s)
    };
  }),

  installSelectedSeries: async () => {
    const { selectedSeriesId, updateSeriesInStore, addLog } = get();
    if (!selectedSeriesId) return;

    try {
      set({ isActionPending: true, error: null });
      updateSeriesInStore(selectedSeriesId, { status: 'installing' });
      addLog(selectedSeriesId, { level: 'info', message: 'Starting installation process...' });

      let lastProgressLog = 0;
      const unsubscribe = window.launcher.series.onInstallProgress((event) => {
        if (event.seriesId !== selectedSeriesId) return;
        set((state) => ({
          actionProgressBySeries: {
            ...state.actionProgressBySeries,
            [selectedSeriesId]: event.progress,
          },
        }));
        if (event.stage === 'downloading' && event.progress - lastProgressLog >= 15) {
          lastProgressLog = event.progress;
          addLog(selectedSeriesId, { level: 'info', message: `${event.message} (${event.progress}%)` });
        }
      });

      const result = await window.launcher.series.install(selectedSeriesId as TerminalSeriesId).finally(unsubscribe);

      if (!result.ok) {
        throw new Error(result.error);
      }

      updateSeriesInStore(selectedSeriesId, { 
        status: 'installed',
        installPath: result.data.installPath,
        installedVersion: result.data.installedVersion,
        assets: withAssetStatus(get().series.find(s => s.id === selectedSeriesId), 'installed')
      });
      addLog(selectedSeriesId, { level: 'success', message: `Installed ${result.data.installedVersion}.` });
    } catch (err) {
      const message = getErrorMessage(err, 'Installation failed');
      updateSeriesInStore(selectedSeriesId, { status: 'error' });
      addLog(selectedSeriesId, { level: 'error', message: `Installation failed: ${message}` });
      set({ error: message });
    } finally {
      set((state) => ({ isActionPending: false, actionProgressBySeries: { ...state.actionProgressBySeries, [selectedSeriesId]: 0 } }));
    }
  },

  launchSelectedSeries: async () => {
    const { selectedSeriesId, updateSeriesInStore, addLog, series } = get();
    if (!selectedSeriesId) return;

    const currentSeries = series.find(s => s.id === selectedSeriesId);
    if (!currentSeries) return;
    const previousStatus = currentSeries.status;

    try {
      set({ isActionPending: true, error: null });
      updateSeriesInStore(selectedSeriesId, { status: 'running' });
      addLog(selectedSeriesId, { level: 'info', message: 'Launching application...' });

      const result = await window.launcher.series.launch(selectedSeriesId as TerminalSeriesId);

      if (!result.ok) {
        throw new Error(result.error);
      }

      updateSeriesInStore(selectedSeriesId, { status: previousStatus });
      addLog(selectedSeriesId, { level: 'success', message: `Launched in ${result.data.terminal}.` });
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to launch');
      updateSeriesInStore(selectedSeriesId, { status: 'error' });
      addLog(selectedSeriesId, { level: 'error', message: `Failed to launch: ${message}` });
      set({ error: message });
    } finally {
      set({ isActionPending: false });
    }
  },

  updateSelectedSeries: async () => {
    const { selectedSeriesId, updateSeriesInStore, addLog, series } = get();
    if (!selectedSeriesId) return;

    const currentSeries = series.find(s => s.id === selectedSeriesId);
    if (!currentSeries) return;

    try {
      set({ isActionPending: true, error: null });
      updateSeriesInStore(selectedSeriesId, { status: 'updating' });
      addLog(selectedSeriesId, { level: 'info', message: 'Downloading updates...' });

      await terminalSeriesApi.updateSeries(selectedSeriesId);

      updateSeriesInStore(selectedSeriesId, { 
        status: 'installed',
        installedVersion: currentSeries.latestVersion,
        assets: withAssetStatus(currentSeries, 'installed')
      });
      addLog(selectedSeriesId, { level: 'success', message: `Updated to ${currentSeries.latestVersion}.` });
    } catch (err) {
      const message = getErrorMessage(err, 'Update failed');
      updateSeriesInStore(selectedSeriesId, { status: 'error' });
      addLog(selectedSeriesId, { level: 'error', message: `Update failed: ${message}` });
      set({ error: message });
    } finally {
      set({ isActionPending: false });
    }
  },

  removeSelectedSeries: async () => {
    const { selectedSeriesId, updateSeriesInStore, addLog } = get();
    if (!selectedSeriesId) return;

    try {
      set({ isActionPending: true, error: null });
      addLog(selectedSeriesId, { level: 'warning', message: 'Removing application...' });

      const result = await window.launcher.series.remove(selectedSeriesId as TerminalSeriesId);
      if (!result.ok) {
        throw new Error(result.error);
      }

      updateSeriesInStore(selectedSeriesId, { 
        status: 'not-installed',
        installedVersion: null,
        installPath: null,
        assets: withAssetStatus(get().series.find(s => s.id === selectedSeriesId), 'not-installed')
      });
      addLog(selectedSeriesId, { level: 'success', message: 'Successfully removed.' });
    } catch (err) {
      const message = getErrorMessage(err, 'Removal failed');
      updateSeriesInStore(selectedSeriesId, { status: 'error' });
      addLog(selectedSeriesId, { level: 'error', message: `Removal failed: ${message}` });
      set({ error: message });
    } finally {
      set({ isActionPending: false });
    }
  },

  verifySelectedSeries: async () => {
    const { selectedSeriesId, addLog } = get();
    if (!selectedSeriesId) return;

    try {
      set({ isActionPending: true, error: null });

      const result = await window.launcher.series.verify(selectedSeriesId as TerminalSeriesId);
      if (!result.ok) {
        throw new Error(result.error);
      }

      addLog(selectedSeriesId, {
        level: result.data.ok ? 'success' : 'warning',
        message: result.data.ok ? result.data.message : `${result.data.message}: ${result.data.missing.join(', ')}`,
      });
    } catch (err) {
      const message = getErrorMessage(err, 'Integrity check failed');
      addLog(selectedSeriesId, { level: 'error', message: `Integrity check failed: ${message}` });
      set({ error: message });
    } finally {
      set({ isActionPending: false });
    }
  },

  revealSelectedSeriesInstallDir: async () => {
    const { selectedSeriesId, addLog } = get();
    if (!selectedSeriesId) return;

    try {
      const result = await window.launcher.series.revealInstallDir(selectedSeriesId as TerminalSeriesId);
      if (!result.ok) {
        throw new Error(result.error);
      }

      addLog(selectedSeriesId, { level: 'info', message: `Opened install folder: ${result.data.path}` });
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to open install folder');
      addLog(selectedSeriesId, { level: 'error', message: `Failed to open install folder: ${message}` });
      set({ error: message });
    }
  },
}));
