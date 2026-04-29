import React from 'react';
import { useTerminalSeriesStore } from '../stores/terminalSeriesStore';

export const SeriesMetadata: React.FC = () => {
  const { series, selectedSeriesId } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);

  if (!currentSeries) return null;

  const mockEvents = [
    { title: `${currentSeries.displayName} Core Engine Update`, date: '27/02' },
    { title: `Performance Patch Notes: ${currentSeries.latestVersion}`, date: '13/02' },
    { title: 'Community Plugins Showcase & Awards', date: '11/02' },
  ];

  return (
    <div className="flex flex-col h-full text-white">
      {mockEvents.map((event, idx) => (
        <button key={idx} className="w-full flex items-center justify-between px-6 py-3 hover:bg-white/10 transition-colors group border-b border-white/5 last:border-0">
          <span className="text-sm font-medium text-white/80 group-hover:text-white truncate pr-4">
            {event.title}
          </span>
          <span className="text-xs text-white/50 font-mono tracking-wider group-hover:text-white/80">
            {event.date}
          </span>
        </button>
      ))}
    </div>
  );
};
