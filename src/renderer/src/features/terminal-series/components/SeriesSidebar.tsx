import React from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';
import { cn } from '../../../shared/lib/cn';
import { Terminal, Settings, User } from 'lucide-react';

export const SeriesSidebar: React.FC = () => {
  const { series, selectedSeriesId, selectSeries } = useTerminalSeriesStore();

  return (
    <div className="flex flex-col h-full items-center py-6">
      {/* Launcher Logo */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-launcher-accent to-purple-500 flex items-center justify-center text-white mb-8 shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-white/20 shrink-0">
        <Terminal size={20} strokeWidth={2.5} />
      </div>

      {/* Series List */}
      <div className="flex-1 overflow-y-auto w-full flex flex-col items-center gap-4 scrollbar-none">
        {series.map((s) => {
          const isSelected = selectedSeriesId === s.id;
          return (
            <div key={s.id} className="relative w-full flex justify-center">
              {/* Active Indicator Line */}
              {isSelected && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-launcher-accent rounded-r-md shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              )}
              
              <button
                onClick={() => selectSeries(s.id)}
                className={cn(
                  "w-12 h-12 rounded-[14px] flex items-center justify-center transition-all duration-300 relative group overflow-hidden",
                  isSelected 
                    ? "bg-launcher-surface border-2 border-launcher-accent shadow-lg" 
                    : "bg-launcher-surface/50 border border-white/5 hover:bg-launcher-surface hover:border-white/20"
                )}
                title={s.displayName}
              >
                {/* Fallback Icon if no image */}
                <span className={cn(
                  "font-black text-xl font-mono",
                  isSelected ? "text-white" : "text-launcher-textMuted group-hover:text-white"
                )}>
                  {s.displayName.charAt(0)}
                </span>
                
                {/* Notification Dot */}
                {s.status === 'update-available' && (
                  <div className="absolute top-0 right-0 w-3 h-3 bg-launcher-warning rounded-full border-2 border-[#121212]" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom Profile / Settings */}
      <div className="mt-auto flex flex-col gap-4 items-center pt-4">
        <button className="w-10 h-10 rounded-full bg-launcher-surface/50 flex items-center justify-center text-launcher-textMuted hover:text-white hover:bg-launcher-surface transition-colors">
          <User size={20} />
        </button>
        <button className="w-10 h-10 flex items-center justify-center text-launcher-textMuted hover:text-white transition-colors pb-2">
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
};
