import React from 'react';

type SectionHeaderProps = {
  title: string;
  description?: string;
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description }) => {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-launcher-text mb-1">{title}</h2>
      {description && <p className="text-sm text-launcher-textMuted">{description}</p>}
    </div>
  );
};
