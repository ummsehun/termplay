import { create } from 'zustand';
import { TerminalSeries, TerminalSeriesTab, TerminalSeriesLog } from '../types/terminalSeriesTypes';
import { terminalSeriesApi } from '../api/terminalSeriesApi';

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

      try {
        const statusResult = await window.launcher.series.getStatus('gascii');
        if (statusResult.ok) {
          get().updateSeriesInStore('gascii', {
            status: statusResult.data.status,
            installedVersion: statusResult.data.installedVersion,
            latestVersion: statusResult.data.latestVersion ?? seriesList.find(s => s.id === 'gascii')?.latestVersion ?? 'unknown',
            installPath: statusResult.data.installPath,
          });
        }
      } catch {
        // 초기 목록 렌더링은 Gascii 상태 조회 실패와 분리한다.
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to load series', isInitializing: false });
    }
  },

  selectSeries: (id: string) => set({ selectedSeriesId: id }),
  setSelectedTab: (tab: TerminalSeriesTab) => set({ selectedTab: tab }),

  updateSeriesInStore: (id, updates) => set((state) => ({
    series: state.series.map(s => s.id === id ? { ...s, ...updates } : s)
  })),

  addLog: (id, logProps) => set((state) => {
    const newLog: TerminalSeriesLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      ...logProps
    };
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

      if (selectedSeriesId === 'gascii') {
        let lastProgressLog = 0;
        const unsubscribe = window.launcher.series.onInstallProgress((event) => {
          if (event.seriesId !== 'gascii') return;
          set((state) => ({
            actionProgressBySeries: {
              ...state.actionProgressBySeries,
              gascii: event.progress,
            },
          }));
          if (event.stage === 'downloading' && event.progress - lastProgressLog >= 15) {
            lastProgressLog = event.progress;
            addLog('gascii', { level: 'info', message: `${event.message} (${event.progress}%)` });
          }
        });

        const result = await window.launcher.series.install('gascii').finally(unsubscribe);

        if (!result.ok) {
          throw new Error(result.error);
        }

        updateSeriesInStore(selectedSeriesId, {
          status: 'installed',
          installPath: result.data.installPath,
          installedVersion: result.data.installedVersion,
          assets: get().series.find(s => s.id === selectedSeriesId)?.assets.map(a => ({ ...a, status: 'installed' })) || []
        });
        addLog(selectedSeriesId, { level: 'success', message: `Installed Gascii ${result.data.installedVersion}.` });
        return;
      }

      await terminalSeriesApi.installSeries(selectedSeriesId);

      updateSeriesInStore(selectedSeriesId, { 
        status: 'installed',
        installPath: `C:\\Program Files\\Lanchaer\\${selectedSeriesId}`,
        installedVersion: 'v1.0.0', // mock value
        assets: get().series.find(s => s.id === selectedSeriesId)?.assets.map(a => ({ ...a, status: 'installed' })) || []
      });
      addLog(selectedSeriesId, { level: 'success', message: 'Installation completed successfully.' });
    } catch (err: any) {
      updateSeriesInStore(selectedSeriesId, { status: 'error' });
      addLog(selectedSeriesId, { level: 'error', message: `Installation failed: ${err.message}` });
      set({ error: err.message });
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

      if (selectedSeriesId === 'gascii') {
        const result = await window.launcher.series.launch('gascii');

        if (!result.ok) {
          throw new Error(result.error);
        }

        updateSeriesInStore(selectedSeriesId, { status: previousStatus });
        addLog(selectedSeriesId, { level: 'success', message: `Launched in ${result.data.terminal}.` });
        return;
      }

      await terminalSeriesApi.launchSeries(selectedSeriesId);

      // Simulate it returning back to its previous status after launch ends (mocking short-lived process)
      updateSeriesInStore(selectedSeriesId, { status: previousStatus });
      addLog(selectedSeriesId, { level: 'success', message: 'Application process exited.' });
    } catch (err: any) {
      updateSeriesInStore(selectedSeriesId, { status: 'error' });
      addLog(selectedSeriesId, { level: 'error', message: `Failed to launch: ${err.message}` });
      set({ error: err.message });
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
        assets: currentSeries.assets.map(a => ({ ...a, status: 'installed' }))
      });
      addLog(selectedSeriesId, { level: 'success', message: `Updated to ${currentSeries.latestVersion}.` });
    } catch (err: any) {
      updateSeriesInStore(selectedSeriesId, { status: 'error' });
      addLog(selectedSeriesId, { level: 'error', message: `Update failed: ${err.message}` });
      set({ error: err.message });
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

      if (selectedSeriesId === 'gascii') {
        const result = await window.launcher.series.remove('gascii');
        if (!result.ok) {
          throw new Error(result.error);
        }

        updateSeriesInStore(selectedSeriesId, {
          status: 'not-installed',
          installedVersion: null,
          installPath: null,
          assets: get().series.find(s => s.id === selectedSeriesId)?.assets.map(a => ({ ...a, status: 'not-installed' })) || []
        });
        addLog(selectedSeriesId, { level: 'success', message: 'Gascii removed.' });
        return;
      }

      await terminalSeriesApi.removeSeries(selectedSeriesId);

      updateSeriesInStore(selectedSeriesId, { 
        status: 'not-installed',
        installedVersion: null,
        installPath: null,
        assets: get().series.find(s => s.id === selectedSeriesId)?.assets.map(a => ({ ...a, status: 'not-installed' })) || []
      });
      addLog(selectedSeriesId, { level: 'success', message: 'Successfully removed.' });
    } catch (err: any) {
      updateSeriesInStore(selectedSeriesId, { status: 'error' });
      addLog(selectedSeriesId, { level: 'error', message: `Removal failed: ${err.message}` });
      set({ error: err.message });
    } finally {
      set({ isActionPending: false });
    }
  },

  verifySelectedSeries: async () => {
    const { selectedSeriesId, addLog } = get();
    if (!selectedSeriesId) return;

    try {
      set({ isActionPending: true, error: null });

      if (selectedSeriesId !== 'gascii') {
        addLog(selectedSeriesId, { level: 'warning', message: 'Integrity check is not available for this series yet.' });
        return;
      }

      const result = await window.launcher.series.verify('gascii');
      if (!result.ok) {
        throw new Error(result.error);
      }

      addLog('gascii', {
        level: result.data.ok ? 'success' : 'warning',
        message: result.data.ok ? result.data.message : `${result.data.message}: ${result.data.missing.join(', ')}`,
      });
    } catch (err: any) {
      addLog(selectedSeriesId, { level: 'error', message: `Integrity check failed: ${err.message}` });
      set({ error: err.message });
    } finally {
      set({ isActionPending: false });
    }
  },

  revealSelectedSeriesInstallDir: async () => {
    const { selectedSeriesId, addLog } = get();
    if (!selectedSeriesId) return;

    try {
      if (selectedSeriesId !== 'gascii') {
        addLog(selectedSeriesId, { level: 'warning', message: 'Install folder reveal is not available for this series yet.' });
        return;
      }

      const result = await window.launcher.series.revealInstallDir('gascii');
      if (!result.ok) {
        throw new Error(result.error);
      }

      addLog('gascii', { level: 'info', message: `Opened install folder: ${result.data.path}` });
    } catch (err: any) {
      addLog(selectedSeriesId, { level: 'error', message: `Failed to open install folder: ${err.message}` });
      set({ error: err.message });
    }
  },
}));
