import React from 'react';
import { Terminal } from 'lucide-react';

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
};

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full">
      <div className="w-16 h-16 bg-launcher-surfaceElevated rounded-full flex items-center justify-center mb-4 text-launcher-muted">
        {icon || <Terminal size={32} />}
      </div>
      <h3 className="text-lg font-medium text-launcher-text mb-2">{title}</h3>
      <p className="text-sm text-launcher-textMuted max-w-sm">{description}</p>
    </div>
  );
};
