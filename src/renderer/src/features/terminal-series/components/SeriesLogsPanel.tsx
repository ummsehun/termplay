import React, { useRef, useEffect } from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';
import { SectionHeader } from '../../../shared/components/SectionHeader';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ScrollText } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';

export const SeriesLogsPanel: React.FC = () => {
  const { series, selectedSeriesId } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSeries?.logs]);

  if (!currentSeries) return null;

  if (currentSeries.logs.length === 0) {
    return (
      <div className="p-8 h-full">
        <EmptyState
          icon={<ScrollText size={32} />}
          title="No Logs Available"
          description="There are no logs recorded for this application yet."
        />
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-launcher-terminal';
      case 'warning': return 'text-launcher-warning';
      case 'error': return 'text-launcher-danger';
      case 'success': return 'text-launcher-success';
      default: return 'text-launcher-textMuted';
    }
  };

  return (
    <div className="p-8 flex flex-col h-full">
      <SectionHeader title="Application Logs" description="Recent output and execution traces." />

      <div className="flex-1 bg-[#0c0c0e] rounded-panel border border-launcher-border p-4 overflow-y-auto font-mono text-sm">
        <div className="space-y-1">
          {currentSeries.logs.map((log) => {
            const date = new Date(log.timestamp);
            const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

            return (
              <div key={log.id} className="flex items-start gap-4 hover:bg-white/5 px-2 py-1 rounded transition-colors">
                <span className="text-launcher-textMuted/50 shrink-0 select-none">[{timeString}]</span>
                <span className={cn("uppercase text-[10px] tracking-widest font-bold w-16 shrink-0 mt-0.5 select-none", getLevelColor(log.level))}>
                  {log.level}
                </span>
                <span className={cn("break-all", log.level === 'error' ? 'text-launcher-danger' : 'text-launcher-textMuted')}>
                  {log.message}
                </span>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
};
