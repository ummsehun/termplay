import React from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';
import { CloudDownload, Loader2, Menu } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';

export const SeriesActionBar: React.FC = () => {
  const { 
    series, 
    selectedSeriesId, 
    isActionPending, 
    installSelectedSeries, 
    launchSelectedSeries, 
    updateSelectedSeries,
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
          className="w-64 h-[72px] bg-launcher-cta hover:bg-launcher-cta-hover text-launcher-cta-text font-black text-2xl tracking-widest rounded-l-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(244,210,89,0.3)]"
        >
          {isActionPending ? <Loader2 className="animate-spin" size={28} /> : null}
          INSTALL
        </button>
      );
    }
    
    if (status === 'installed' || status === 'update-available' || status === 'running') {
      return (
        <button
          onClick={launchSelectedSeries}
          disabled={isPending}
          className="w-64 h-[72px] bg-launcher-cta hover:bg-launcher-cta-hover text-launcher-cta-text font-black text-2xl tracking-widest rounded-l-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(244,210,89,0.3)]"
        >
          {status === 'running' ? <Loader2 className="animate-spin" size={28} /> : null}
          {status === 'running' ? 'RUNNING' : 'PLAY'}
        </button>
      );
    }

    if (status === 'installing' || status === 'updating') {
      return (
        <button
          disabled
          className="w-64 h-[72px] bg-white/10 backdrop-blur text-white font-black text-xl tracking-widest rounded-l-xl flex items-center justify-center gap-3 border border-white/20"
        >
          <Loader2 className="animate-spin" size={24} />
          {status === 'installing' ? 'INSTALLING' : 'UPDATING'}
        </button>
      );
    }

    return null;
  };

  return (
    <div className="flex items-center gap-4">
      
      {/* Download Status Info (Mock) */}
      {(status === 'update-available' || status === 'installing' || status === 'updating') && (
        <div className="flex items-center gap-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-6 py-2">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-white/20"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="text-launcher-accent transition-all duration-1000"
                strokeDasharray={status === 'updating' || status === 'installing' ? "45, 100" : "100, 100"}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
            </svg>
            <CloudDownload className="absolute text-white" size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm">
              {status === 'update-available' ? 'Update Available' : '8.15 Mb/s'}
            </span>
            <span className="text-white/50 text-xs font-mono">11.48 GB</span>
          </div>
        </div>
      )}

      {/* Main Action Group */}
      <div className="flex items-center">
        {renderPrimaryAction()}
        
        {/* Dropdown Menu Toggle (Mock) */}
        <button className="h-[72px] w-14 bg-launcher-cta/90 hover:bg-launcher-cta text-launcher-cta-text flex items-center justify-center rounded-r-xl border-l border-black/20">
          <Menu size={24} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};
