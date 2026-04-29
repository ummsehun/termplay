import React from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';
import { SectionHeader } from '../../../shared/components/SectionHeader';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Package } from 'lucide-react';

export const SeriesAssetsPanel: React.FC = () => {
  const { series, selectedSeriesId } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);

  if (!currentSeries) return null;

  if (currentSeries.assets.length === 0) {
    return (
      <div className="p-8 h-full">
        <EmptyState
          icon={<Package size={32} />}
          title="No Assets Required"
          description="This project does not require any additional assets to be downloaded."
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <SectionHeader title="Assets & Dependencies" description="Manage required and optional assets for this application." />

      <div className="grid gap-4 max-w-4xl">
        {currentSeries.assets.map((asset) => (
          <div key={asset.id} className="flex items-center justify-between p-4 rounded-panel bg-launcher-surface border border-launcher-border hover:border-launcher-muted transition-colors">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="font-medium">{asset.name}</span>
                {asset.required && <span className="text-[10px] px-2 py-0.5 rounded-full bg-launcher-surfaceElevated text-launcher-textMuted uppercase tracking-wider border border-launcher-border">Required</span>}
              </div>
              <span className="text-sm text-launcher-textMuted">{asset.description}</span>
            </div>

            <div className="flex items-center gap-6">
              <span className="text-sm font-mono text-launcher-textMuted">{asset.sizeLabel}</span>
              <StatusBadge status={asset.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
