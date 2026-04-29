import React from 'react';
import { cn } from '../lib/cn';

type AppShellProps = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

export const AppShell: React.FC<AppShellProps> = ({ sidebar, children }) => {
  return (
    <div className="flex h-screen w-full bg-black text-launcher-text overflow-hidden">
      {/* Thin Left Sidebar */}
      <div className="w-sidebar flex-shrink-0 bg-[#121212] border-r border-white/5 flex flex-col z-50">
        {sidebar}
      </div>
      
      {/* Main Content (Immersive) */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-black">
        {children}
      </main>
    </div>
  );
};
