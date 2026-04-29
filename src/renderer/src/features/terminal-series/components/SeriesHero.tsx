import React from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';
import { cn } from '../../../shared/lib/cn';
import { TerminalSeriesTab } from '../types/terminalSeriesTypes';
import { SeriesMetadata } from './SeriesMetadata';
import { SeriesAssetsPanel } from './SeriesAssetsPanel';
import { SeriesLogsPanel } from './SeriesLogsPanel';
import { Package, Wrench, Calendar, BookOpen } from 'lucide-react';

export const SeriesHero: React.FC = () => {
  const { series, selectedSeriesId, selectedTab, setSelectedTab } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);

  if (!currentSeries) return null;

  const tabs: { id: TerminalSeriesTab; label: string }[] = [
    { id: 'overview', label: 'Events' },
    { id: 'assets', label: 'Notices' },
    { id: 'logs', label: 'Info' },
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
            Terminal Edition
          </span>
        </div>
      </div>

      {/* Mock Image Carousel */}
      <div className="w-full h-48 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl mb-4 overflow-hidden relative pointer-events-auto shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-tr from-launcher-accent/20 to-transparent mix-blend-overlay" />
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <h3 className="text-white font-bold text-xl drop-shadow-md">New Updates Available</h3>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-white/30" />
            <div className="w-2 h-2 rounded-full bg-white/30" />
          </div>
        </div>
      </div>

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
          { icon: Wrench, label: 'Toolbox' },
          { icon: Calendar, label: 'Check-In' },
          { icon: Package, label: 'Assets' },
          { icon: BookOpen, label: 'Wiki' }
        ].map((item, idx) => (
          <button key={idx} className="flex flex-col items-center gap-2 group">
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
