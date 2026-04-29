import React from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';
import { Play, Download, RefreshCw, Trash2, Loader2, FolderOpen } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';

export const SeriesActionBar: React.FC = () => {
  const {
    series,
    selectedSeriesId,
    isActionPending,
    installSelectedSeries,
    launchSelectedSeries,
    updateSelectedSeries,
    removeSelectedSeries
  } = useTerminalSeriesStore();

  const currentSeries = series.find(s => s.id === selectedSeriesId);
  if (!currentSeries) return null;

  const status = currentSeries.status;
  const isPending = isActionPending || status === 'installing' || status === 'updating' || status === 'running';

  const renderPrimaryAction = () => {
    if (status === 'not-installed') {
      return (
        <button
          onClick={installSelectedSeries}
          disabled={isPending}
          className="flex-1 max-w-xs flex items-center justify-center gap-3 bg-launcher-text text-launcher-bg hover:bg-launcher-primaryHover py-4 px-8 rounded-launcher font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
        >
          {isActionPending ? <Loader2 className="animate-spin" size={24} /> : <Download size={24} />}
          Install
        </button>
      );
    }

    if (status === 'installed' || status === 'update-available' || status === 'running') {
      return (
        <button
          onClick={launchSelectedSeries}
          disabled={isPending}
          className="flex-1 max-w-xs flex items-center justify-center gap-3 bg-launcher-success text-white hover:bg-launcher-success/90 py-4 px-8 rounded-launcher font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
        >
          {status === 'running' ? <Loader2 className="animate-spin" size={24} /> : <Play fill="currentColor" size={24} />}
          {status === 'running' ? 'Running...' : 'Launch'}
        </button>
      );
    }

    if (status === 'installing' || status === 'updating') {
      return (
        <button
          disabled
          className="flex-1 max-w-xs flex items-center justify-center gap-3 bg-launcher-surfaceElevated text-launcher-textMuted py-4 px-8 rounded-launcher font-bold text-lg border border-launcher-border"
        >
          <Loader2 className="animate-spin" size={24} />
          {status === 'installing' ? 'Installing...' : 'Updating...'}
        </button>
      );
    }

    return null;
  };

  return (
    <div className="flex items-center gap-4">
      {renderPrimaryAction()}

      {status === 'update-available' && (
        <button
          onClick={updateSelectedSeries}
          disabled={isPending}
          className="flex items-center gap-2 bg-launcher-warning/20 text-launcher-warning hover:bg-launcher-warning/30 px-6 py-4 rounded-launcher font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw size={20} className={cn(currentSeries.status === 'updating' && "animate-spin")} />
          Update to {currentSeries.latestVersion}
        </button>
      )}

      {(status === 'installed' || status === 'update-available') && (
        <div className="flex items-center gap-2 ml-auto">
          <button
            disabled={true} // Mock feature
            className="p-4 rounded-launcher bg-launcher-surface border border-launcher-border text-launcher-textMuted hover:text-launcher-text hover:bg-launcher-surfaceElevated transition-colors disabled:opacity-50"
            title="Open Install Folder"
          >
            <FolderOpen size={20} />
          </button>
          <button
            onClick={removeSelectedSeries}
            disabled={isPending}
            className="p-4 rounded-launcher bg-launcher-surface border border-launcher-border text-launcher-textMuted hover:text-launcher-danger hover:border-launcher-danger/50 hover:bg-launcher-danger/10 transition-colors disabled:opacity-50"
            title="Remove"
          >
            <Trash2 size={20} />
          </button>
        </div>
      )}
    </div>
  );
};
