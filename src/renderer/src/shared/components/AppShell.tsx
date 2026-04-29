import React from 'react';
import { cn } from '../lib/cn';

type AppShellProps = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

export const AppShell: React.FC<AppShellProps> = ({ sidebar, children }) => {
  return (
    <div className="flex h-screen w-full bg-launcher-bg text-launcher-text overflow-hidden">
      {/* Sidebar */}
      <div className="w-sidebar flex-shrink-0 border-r border-launcher-border bg-launcher-surface flex flex-col">
        {sidebar}
      </div>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-launcher-bg">
        {children}
      </main>
    </div>
  );
};
