import React from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';
import { cn } from '../../../shared/lib/cn';
import { TerminalSeriesTab } from '../types/terminalSeriesTypes';
import { SeriesMetadata } from './SeriesMetadata';
import { SeriesAssetsPanel } from './SeriesAssetsPanel';
import { SeriesLogsPanel } from './SeriesLogsPanel';
import { Package, BookOpen, Rocket, Library } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUIStore, ModalType } from '../../../shared/stores/uiStore';

export const SeriesHero: React.FC = () => {
  const { t } = useTranslation();
  const { openModal } = useUIStore();
  const { series, selectedSeriesId, selectedTab, setSelectedTab } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);

  if (!currentSeries) return null;

  const tabs: { id: TerminalSeriesTab; label: string }[] = [
    { id: 'overview', label: t('launcher.events') },
    { id: 'assets', label: t('launcher.notices') },
    { id: 'logs', label: t('launcher.info') },
  ];

  return (
    <div className="w-[480px] h-full pt-20 pl-16 pb-12 flex flex-col pointer-events-none">
      {/* Title / Logo Area */}
      <div className="mb-8 pointer-events-auto">
        <h1 className="text-6xl font-black text-white italic tracking-tighter drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
          {currentSeries.displayName.toUpperCase()}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2 py-0.5 bg-launcher-accent/80 backdrop-blur text-white text-xs font-bold uppercase tracking-widest rounded-sm">
            {t('launcher.title')}
          </span>
        </div>
      </div>

      {/* Empty space to show the background banner */}
      <div className="w-full h-48 mb-4 shrink-0" />

      {/* Translucent Content Panel (Events/Notices/Info) */}
      <div className="w-full flex-1 flex flex-col bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl mb-4 pointer-events-auto overflow-hidden shadow-2xl">
        <div className="flex gap-6 px-6 pt-4 border-b border-white/10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={cn(
                "pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative",
                selectedTab === tab.id ? "text-white" : "text-white/50 hover:text-white/80"
              )}
            >
              {tab.label}
              {selectedTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white shadow-[0_-2px_10px_rgba(255,255,255,0.5)]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 relative overflow-y-auto scrollbar-none">
          {selectedTab === 'overview' && <SeriesMetadata />}
          {selectedTab === 'assets' && <SeriesAssetsPanel />}
          {selectedTab === 'logs' && <SeriesLogsPanel />}
          {/* Settings tab removed from main loop to match UI, can be accessed from sidebar */}
        </div>
      </div>

      {/* Quick Action Icons Panel */}
      <div className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex justify-between items-center pointer-events-auto shadow-2xl">
        {[
          { id: 'launcher', icon: Rocket, label: t('launcher.launcher_action') },
          { id: 'library', icon: Library, label: t('launcher.library_action') },
          { id: 'assets', icon: Package, label: t('launcher.assets_action') },
          { id: 'guide', icon: BookOpen, label: t('launcher.guide_action') }
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={() => openModal(item.id as ModalType)}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-white/80 group-hover:text-white group-hover:border-white/30 group-hover:from-white/20 transition-all">
              <item.icon size={22} />
            </div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-white/60 group-hover:text-white/90">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
