import React from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { SeriesActionBar } from './SeriesActionBar';
import { GitBranch, HardDrive, Cpu } from 'lucide-react';

export const SeriesHero: React.FC = () => {
  const { series, selectedSeriesId } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);

  if (!currentSeries) return null;

  return (
    <div className="relative pt-24 px-12 pb-12 overflow-hidden shrink-0">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-launcher-terminal/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="relative z-10 max-w-4xl">
        <div className="flex items-center gap-4 mb-4">
          <StatusBadge status={currentSeries.status} />
          {currentSeries.installedVersion && (
            <span className="text-sm font-mono text-launcher-textMuted bg-launcher-surface px-2 py-1 rounded-md border border-launcher-border">
              {currentSeries.installedVersion}
            </span>
          )}
        </div>

        <h2 className="text-5xl font-black text-white tracking-tight mb-4 drop-shadow-lg">
          {currentSeries.displayName}
        </h2>

        <p className="text-lg text-launcher-textMuted max-w-2xl leading-relaxed mb-8">
          {currentSeries.description}
        </p>

        <div className="flex flex-wrap gap-6 mb-12">
          <div className="flex items-center gap-2 text-sm text-launcher-textMuted">
            <GitBranch size={16} />
            <a href={currentSeries.repositoryUrl} target="_blank" rel="noreferrer" className="hover:text-launcher-primary transition-colors">
              Repository
            </a>
          </div>
          {currentSeries.installPath && (
            <div className="flex items-center gap-2 text-sm text-launcher-textMuted">
              <HardDrive size={16} />
              <span className="font-mono text-xs">{currentSeries.installPath}</span>
            </div>
          )}
          {currentSeries.runtimeRequirements.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-launcher-textMuted">
              <Cpu size={16} />
              <span>Requires: {currentSeries.runtimeRequirements.join(', ')}</span>
            </div>
          )}
        </div>

        <SeriesActionBar />
      </div>
    </div>
  );
};
