import React from 'react';
import { TerminalSeriesStatus, TerminalSeriesAssetStatus } from '../../features/terminal-series/types/terminalSeriesTypes';
import { cn } from '../lib/cn';

type StatusBadgeProps = {
  status: TerminalSeriesStatus | TerminalSeriesAssetStatus;
  className?: string;
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config: Record<string, { label: string; colorClass: string; dotClass: string }> = {
    'not-installed': { label: 'Not Installed', colorClass: 'text-launcher-textMuted bg-launcher-surfaceElevated border-launcher-border', dotClass: 'bg-launcher-muted' },
    'installed': { label: 'Installed', colorClass: 'text-launcher-success bg-launcher-success/10 border-launcher-success/20', dotClass: 'bg-launcher-success' },
    'update-available': { label: 'Update Available', colorClass: 'text-launcher-warning bg-launcher-warning/10 border-launcher-warning/20', dotClass: 'bg-launcher-warning' },
    'installing': { label: 'Installing...', colorClass: 'text-launcher-accent bg-launcher-accent/10 border-launcher-accent/20', dotClass: 'bg-launcher-accent animate-pulse' },
    'updating': { label: 'Updating...', colorClass: 'text-launcher-accent bg-launcher-accent/10 border-launcher-accent/20', dotClass: 'bg-launcher-accent animate-pulse' },
    'running': { label: 'Running', colorClass: 'text-launcher-success bg-launcher-success/20 border-launcher-success/30 shadow-glow', dotClass: 'bg-launcher-success animate-pulse' },
    'error': { label: 'Error', colorClass: 'text-launcher-danger bg-launcher-danger/10 border-launcher-danger/20', dotClass: 'bg-launcher-danger' },
    'missing': { label: 'Missing', colorClass: 'text-launcher-danger bg-launcher-danger/10 border-launcher-danger/20', dotClass: 'bg-launcher-danger' },
    'outdated': { label: 'Outdated', colorClass: 'text-launcher-warning bg-launcher-warning/10 border-launcher-warning/20', dotClass: 'bg-launcher-warning' },
  };

  const current = config[status] || config['not-installed'];

  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium', current.colorClass, className)}>
      <span className={cn('w-2 h-2 rounded-full', current.dotClass)}></span>
      {current.label}
    </div>
  );
};
