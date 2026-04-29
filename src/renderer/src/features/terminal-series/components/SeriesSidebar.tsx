import React from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';
import { cn } from '../../../shared/lib/cn';
import { Terminal, Settings, Settings2 } from 'lucide-react';

export const SeriesSidebar: React.FC = () => {
  const { series, selectedSeriesId, selectSeries } = useTerminalSeriesStore();

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center gap-3 border-b border-launcher-border">
        <div className="w-8 h-8 rounded-lg bg-launcher-terminal flex items-center justify-center text-white shadow-glow">
          <Terminal size={18} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-wide text-launcher-text">Lanchaer</h1>
          <p className="text-[10px] uppercase tracking-wider text-launcher-textMuted font-medium">Terminal Series</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="text-xs font-semibold text-launcher-textMuted uppercase tracking-wider mb-4 px-2">Library</div>

        {series.map((s) => (
          <button
            key={s.id}
            onClick={() => selectSeries(s.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-launcher text-left transition-all duration-200",
              selectedSeriesId === s.id
                ? "bg-launcher-surfaceElevated text-launcher-primary shadow-sm ring-1 ring-launcher-border/50"
                : "text-launcher-textMuted hover:bg-launcher-surface/50 hover:text-launcher-text"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              s.status === 'installed' ? 'bg-launcher-success' :
                s.status === 'update-available' ? 'bg-launcher-warning' :
                  s.status === 'running' ? 'bg-launcher-success animate-pulse shadow-glow' :
                    'bg-launcher-muted'
            )} />
            <span className="font-medium truncate">{s.displayName}</span>
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-launcher-border">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-launcher text-left text-launcher-textMuted hover:bg-launcher-surface/50 hover:text-launcher-text transition-all duration-200">
          <Settings2 size={18} />
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
};
