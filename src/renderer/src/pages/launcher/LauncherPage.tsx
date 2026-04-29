import React, { useEffect } from 'react';
import { useTerminalSeriesStore } from '../../features/terminal-series/stores/terminalSeriesStore';
import { AppShell } from '../../shared/components/AppShell';
import { SeriesSidebar } from '../../features/terminal-series/components/SeriesSidebar';
import { SeriesHero } from '../../features/terminal-series/components/SeriesHero';
import { SeriesActionBar } from '../../features/terminal-series/components/SeriesActionBar';
import { Loader2, Home, Globe, Link, Share2, Video, MessageSquare, Settings as SettingsIcon, Minus, X, Square } from 'lucide-react';

export const LauncherPage: React.FC = () => {
  const { initialize, isInitializing, error, series, selectedSeriesId } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#09090b] text-launcher-text">
        <Loader2 className="animate-spin text-launcher-accent" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#09090b] text-launcher-text">
        <div className="text-center">
          <div className="text-launcher-danger text-4xl mb-4">⚠</div>
          <h2 className="text-xl font-bold">Initialization Failed</h2>
          <p className="text-launcher-textMuted">{error}</p>
        </div>
      </div>
    );
  }

  // Dynamic Background based on selected series
  const getBackgroundStyle = () => {
    if (currentSeries?.id === 'gascii') {
      return {
        background: `radial-gradient(circle at 70% 30%, rgba(34, 197, 94, 0.15) 0%, transparent 50%),
                     radial-gradient(circle at 30% 80%, rgba(14, 165, 233, 0.1) 0%, transparent 40%),
                     #050505`
      };
    }
    if (currentSeries?.id === 'mienjine') {
      return {
        background: `radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 60%),
                     radial-gradient(circle at 20% 70%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
                     #0a0510`
      };
    }
    return { background: '#09090b' };
  };

  return (
    <AppShell sidebar={<SeriesSidebar />}>
      {/* Immersive Background */}
      <div 
        className="absolute inset-0 z-0 transition-colors duration-1000"
        style={getBackgroundStyle()}
      >
        {/* Mock character / abstract art placeholder */}
        <div className="absolute right-0 bottom-0 w-2/3 h-[90%] bg-gradient-to-t from-black/80 to-transparent z-0 pointer-events-none" />
      </div>

      {/* Top Window Controls (Mock) */}
      <div className="absolute top-0 right-0 left-0 h-10 flex justify-end items-center px-4 z-50 pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <button className="text-white/50 hover:text-white transition-colors"><SettingsIcon size={16} /></button>
          <div className="w-px h-4 bg-white/20 mx-2" />
          <button className="text-white/50 hover:text-white transition-colors"><Minus size={16} /></button>
          <button className="text-white/50 hover:text-white transition-colors"><Square size={14} /></button>
          <button className="text-white/50 hover:text-launcher-danger transition-colors"><X size={18} /></button>
        </div>
      </div>

      {/* Floating Right Social Toolbar */}
      <div className="absolute right-6 top-24 flex flex-col gap-3 z-40 bg-black/20 backdrop-blur-md p-2 rounded-2xl border border-white/10">
        {[Home, Globe, Link, Share2, Video, MessageSquare].map((Icon, idx) => (
          <button key={idx} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all">
            <Icon size={16} />
          </button>
        ))}
      </div>

      {/* Main Content Layout */}
      {currentSeries ? (
        <div className="relative z-10 w-full h-full flex">
          {/* Left Hero Area */}
          <SeriesHero />
          
          {/* Bottom Right CTA Area */}
          <div className="absolute bottom-8 right-8 z-50">
            <SeriesActionBar />
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex items-center justify-center text-launcher-textMuted">
          Select a project from the sidebar
        </div>
      )}
    </AppShell>
  );
};
