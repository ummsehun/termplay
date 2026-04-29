import React from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';
import { SectionHeader } from '../../../shared/components/SectionHeader';
import { cn } from '../../../shared/lib/cn';

export const SeriesMetadata: React.FC = () => {
  const { series, selectedSeriesId } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);

  if (!currentSeries) return null;

  return (
    <div className="p-8">
      <SectionHeader title="Overview" description="General information about this project." />

      <div className="grid grid-cols-2 gap-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <div className="text-xs text-launcher-textMuted uppercase tracking-wider mb-2 font-medium">Description</div>
            <p className="text-sm leading-relaxed">{currentSeries.description}</p>
          </div>
          <div>
            <div className="text-xs text-launcher-textMuted uppercase tracking-wider mb-2 font-medium">Requirements</div>
            <div className="flex flex-wrap gap-2">
              {currentSeries.runtimeRequirements.length > 0 ? (
                currentSeries.runtimeRequirements.map(req => (
                  <span key={req} className="px-2 py-1 bg-launcher-surfaceElevated rounded text-xs border border-launcher-border">
                    {req}
                  </span>
                ))
              ) : (
                <span className="text-sm text-launcher-textMuted">None</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-xs text-launcher-textMuted uppercase tracking-wider mb-2 font-medium">Version Info</div>
            <div className="bg-launcher-surface border border-launcher-border rounded-panel p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-launcher-textMuted">Installed Version</span>
                <span className="font-mono">{currentSeries.installedVersion || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-launcher-textMuted">Latest Version</span>
                <span className="font-mono">{currentSeries.latestVersion}</span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs text-launcher-textMuted uppercase tracking-wider mb-2 font-medium">Install Path</div>
            <div className="bg-launcher-surface border border-launcher-border rounded-panel p-4 overflow-hidden">
              <div className="text-sm font-mono text-launcher-textMuted truncate">
                {currentSeries.installPath || 'Not installed'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
