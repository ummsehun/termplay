import React, { useEffect } from 'react';
import { useTerminalSeriesStore } from '../../features/terminal-series/stores/terminalSeriesStore';
import { AppShell } from '../../shared/components/AppShell';
import { TopBar } from '../../shared/components/TopBar';
import { SeriesSidebar } from '../../features/terminal-series/components/SeriesSidebar';
import { SeriesHero } from '../../features/terminal-series/components/SeriesHero';
import { SeriesMetadata } from '../../features/terminal-series/components/SeriesMetadata';
import { SeriesAssetsPanel } from '../../features/terminal-series/components/SeriesAssetsPanel';
import { SeriesLogsPanel } from '../../features/terminal-series/components/SeriesLogsPanel';
import { SeriesSettingsPanel } from '../../features/terminal-series/components/SeriesSettingsPanel';
import { TerminalSeriesTab } from '../../features/terminal-series/types/terminalSeriesTypes';
import { cn } from '../../shared/lib/cn';
import { Loader2 } from 'lucide-react';

export const LauncherPage: React.FC = () => {
  const { initialize, isInitializing, error, selectedTab, setSelectedTab, series, selectedSeriesId } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-launcher-bg text-launcher-text">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-launcher-accent" size={48} />
          <p className="text-launcher-textMuted font-medium animate-pulse">Initializing Lanchaer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-launcher-bg text-launcher-text">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-16 h-16 bg-launcher-danger/10 rounded-full flex items-center justify-center text-launcher-danger mb-4">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-bold">Initialization Failed</h2>
          <p className="text-launcher-textMuted">{error}</p>
          <button 
            onClick={() => initialize()}
            className="mt-4 px-6 py-2 bg-launcher-surfaceElevated hover:bg-launcher-surface border border-launcher-border rounded-control transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: TerminalSeriesTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'assets', label: 'Assets' },
    { id: 'logs', label: 'Logs' },
  ];

  return (
    <AppShell sidebar={<SeriesSidebar />}>
      <TopBar title={currentSeries?.displayName || 'Select a Project'} />
      
      {currentSeries ? (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <SeriesHero />
          
          <div className="px-12 border-b border-launcher-border flex gap-8 shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={cn(
                  "py-4 text-sm font-medium transition-colors relative",
                  selectedTab === tab.id ? "text-launcher-primary" : "text-launcher-textMuted hover:text-launcher-text"
                )}
              >
                {tab.label}
                {selectedTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-launcher-accent shadow-[0_-2px_10px_rgba(59,130,246,0.5)]" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 relative">
            {selectedTab === 'overview' && <SeriesMetadata />}
            {selectedTab === 'assets' && <SeriesAssetsPanel />}
            {selectedTab === 'logs' && <SeriesLogsPanel />}
            {selectedTab === 'settings' && <SeriesSettingsPanel />}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-launcher-textMuted">
          Select a project from the sidebar to view details.
        </div>
      )}
    </AppShell>
  );
};
