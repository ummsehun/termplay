import React from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';
import { StatusBadge } from '../../../shared/components/StatusBadge';

export const SeriesAssetsPanel: React.FC = () => {
  const { series, selectedSeriesId } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);

  if (!currentSeries) return null;

  return (
    <div className="flex flex-col h-full text-white">
      {currentSeries.assets.length === 0 ? (
        <div className="p-6 text-sm text-white/50">No additional assets required.</div>
      ) : (
        currentSeries.assets.map((asset) => (
          <div key={asset.id} className="w-full flex items-center justify-between px-6 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white/80 truncate">
                {asset.name}
              </span>
              {asset.required && <span className="text-[9px] px-1.5 py-0.5 bg-white/20 rounded text-white/80 uppercase tracking-widest">Required</span>}
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-xs text-white/50 font-mono tracking-wider">{asset.sizeLabel}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
