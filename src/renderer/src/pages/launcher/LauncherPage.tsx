import React, { useEffect } from 'react';
import { useTerminalSeriesStore } from '../../features/terminal-series/stores/terminalSeriesStore';
import { AppShell } from '../../shared/components/AppShell';
import { SeriesSidebar } from '../../features/terminal-series/components/SeriesSidebar';
import { SeriesHero } from '../../features/terminal-series/components/SeriesHero';
import { SeriesActionBar } from '../../features/terminal-series/components/SeriesActionBar';
import { useUIStore } from '../../shared/stores/uiStore';
import { Loader2, Home, Globe, Link, MessageSquare, Settings as SettingsIcon, Minus, X, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../shared/lib/cn';
import gasciiBanner from '../../../assets/gascii/banner.png';
import mienjineBanner from '../../../assets/mienjine/banner.png';

export const LauncherPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { openSettings } = useUIStore();
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
          <h2 className="text-xl font-bold">{t('launcher.init_failed')}</h2>
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

  const socialLinks = [
    { icon: Home, url: 'https://github.com/ummsehun/launcher' },
    { icon: Globe, url: '#' },
    {
      icon: Link,
      url: currentSeries?.id === 'gascii'
        ? 'https://github.com/ummsehun/Gascii'
        : currentSeries?.id === 'mienjine'
          ? 'https://github.com/ummsehun/3D-enjine'
          : '#'
    },
    { icon: MessageSquare, url: '#' }
  ];

  const openExternalLink = async (url: string) => {
    if (url === '#') {
      return;
    }

    await window.launcher.navigation.openExternal(url);
  };

  return (
    <AppShell sidebar={<SeriesSidebar />}>
      {/* Immersive Background */}
      <div
        className="absolute inset-0 z-0 transition-colors duration-1000"
        style={getBackgroundStyle()}
      >
        {/* Series banner — full background */}
        {currentSeries?.id === 'gascii' && (
          <img
            src={gasciiBanner}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            aria-hidden="true"
          />
        )}
        {currentSeries?.id === 'mienjine' && (
          <img
            src={mienjineBanner}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            aria-hidden="true"
          />
        )}
        {/* Overlay so left-side UI remains readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent pointer-events-none" />
        {/* Bottom vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Floating Right Social Toolbar */}
      <div className="absolute right-6 top-24 flex flex-col gap-3 z-40 bg-black/20 backdrop-blur-md p-2 rounded-2xl border border-white/10">
        {socialLinks.map((item, idx) => (
          <button
            key={idx}
            onClick={() => void openExternalLink(item.url)}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              item.url !== '#'
                ? "bg-white/5 text-white/70 hover:text-white hover:bg-white/20 cursor-pointer"
                : "bg-white/5 text-white/20 cursor-not-allowed"
            )}
            title={item.url !== '#' ? item.url : 'Not Available'}
          >
            <item.icon size={16} />
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
          {t('launcher.select_project')}
        </div>
      )}
    </AppShell>
  );
};
