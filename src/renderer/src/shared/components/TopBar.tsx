import React from 'react';

type TopBarProps = {
  title: string;
};

export const TopBar: React.FC<TopBarProps> = ({ title }) => {
  return (
    <div className="h-topbar flex items-center px-8 border-b border-launcher-border bg-launcher-bg/80 backdrop-blur-sm z-10 sticky top-0 shrink-0">
      <h1 className="text-xl font-bold text-launcher-text tracking-tight">{title}</h1>
    </div>
  );
};
