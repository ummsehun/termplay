import React, { useState } from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';
import { CloudDownload, FolderOpen, Loader2, Menu, ShieldCheck, Trash2 } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';
import { useTranslation } from 'react-i18next';

export const SeriesActionBar: React.FC = () => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { 
    series, 
    selectedSeriesId, 
    isActionPending, 
    installSelectedSeries, 
    launchSelectedSeries, 
    updateSelectedSeries,
    removeSelectedSeries,
    verifySelectedSeries,
    revealSelectedSeriesInstallDir,
    actionProgressBySeries,
  } = useTerminalSeriesStore();

  const currentSeries = series.find(s => s.id === selectedSeriesId);
  if (!currentSeries) return null;

  const status = currentSeries.status;
  const isPending = isActionPending || status === 'installing' || status === 'updating' || status === 'running';
  const actionProgress = actionProgressBySeries[currentSeries.id] ?? 0;

  const renderPrimaryAction = () => {
    if (status === 'not-installed') {
      return (
        <button
          onClick={installSelectedSeries}
          disabled={isPending}
          className="w-64 h-[72px] bg-launcher-cta hover:bg-launcher-cta-hover text-launcher-cta-text font-black text-2xl tracking-widest rounded-l-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(244,210,89,0.3)]"
        >
          {isActionPending ? <Loader2 className="animate-spin" size={28} /> : null}
          {t('launcher.install')}
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
          {status === 'running' ? t('launcher.running') : t('launcher.play')}
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
          {status === 'installing' ? t('launcher.installing') : t('launcher.updating')}
        </button>
      );
    }

    return null;
  };

  return (
    <div className="relative flex items-center gap-4">
      
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
                strokeDasharray={status === 'updating' || status === 'installing' ? `${Math.max(actionProgress, 8)}, 100` : "100, 100"}
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
              {status === 'update-available' ? t('launcher.update_available') : '8.15 Mb/s'}
            </span>
            <span className="text-white/50 text-xs font-mono">
              {status === 'installing' || status === 'updating' ? `${actionProgress}%` : '11.48 GB'}
            </span>
          </div>
        </div>
      )}

      {/* Main Action Group */}
      <div className="flex items-center">
        {renderPrimaryAction()}
        
        <button
          onClick={() => setIsMenuOpen((value) => !value)}
          disabled={isPending}
          className="h-[72px] w-14 bg-launcher-cta/90 hover:bg-launcher-cta disabled:opacity-50 text-launcher-cta-text flex items-center justify-center rounded-r-xl border-l border-black/20"
          title={t('launcher.options')}
        >
          <Menu size={24} strokeWidth={3} />
        </button>
      </div>

      {isMenuOpen && (
        <div className="absolute bottom-[84px] right-0 z-[80] w-64 overflow-hidden rounded-xl border border-white/10 bg-black/85 shadow-2xl backdrop-blur-xl">
          <button
            onClick={() => {
              setIsMenuOpen(false);
              verifySelectedSeries();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] font-semibold text-white/85 hover:bg-white/10"
          >
            <ShieldCheck size={18} />
            {t('launcher.option_verify')}
          </button>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              revealSelectedSeriesInstallDir();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] font-semibold text-white/85 hover:bg-white/10"
          >
            <FolderOpen size={18} />
            {t('launcher.option_open_install_dir')}
          </button>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              if (!window.confirm(t('launcher.option_remove_confirm'))) {
                return;
              }
              removeSelectedSeries();
            }}
            disabled={status === 'not-installed'}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={18} />
            {t('launcher.option_remove')}
          </button>
        </div>
      )}
    </div>
  );
};
