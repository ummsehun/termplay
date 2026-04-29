import React, { useRef, useEffect } from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';
import { cn } from '../../../shared/lib/cn';

export const SeriesLogsPanel: React.FC = () => {
  const { series, selectedSeriesId } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSeries?.logs]);

  if (!currentSeries) return null;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-launcher-accent';
      case 'warning': return 'text-launcher-warning';
      case 'error': return 'text-launcher-danger';
      case 'success': return 'text-launcher-success';
      default: return 'text-white/50';
    }
  };

  return (
    <div className="flex flex-col h-full text-white p-4 font-mono text-xs overflow-y-auto scrollbar-none">
      {currentSeries.logs.length === 0 ? (
        <div className="text-white/50">No execution info available.</div>
      ) : (
        currentSeries.logs.map((log) => {
          const date = new Date(log.timestamp);
          const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
          
          return (
            <div key={log.id} className="flex items-start gap-3 py-1 hover:bg-white/5 rounded px-2 transition-colors">
              <span className="text-white/30 shrink-0 select-none">[{timeString}]</span>
              <span className={cn("uppercase text-[9px] tracking-widest font-bold w-12 shrink-0 mt-0.5 select-none", getLevelColor(log.level))}>
                {log.level}
              </span>
              <span className={cn("break-words", log.level === 'error' ? 'text-launcher-danger' : 'text-white/80')}>
                {log.message}
              </span>
            </div>
          );
        })
      )}
      <div ref={endRef} />
    </div>
  );
};
