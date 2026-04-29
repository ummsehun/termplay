import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminalSeriesStore } from '../../terminal-series/stores/terminalSeriesStore';
import { getSeriesFeatureConfig, TerminalSeriesId } from '../../terminal-series/constants/seriesFeatureConfig';
import { DirSummary } from '@shared/launcherTypes';

export const LibraryPanel: React.FC = () => {
  const { t } = useTranslation();
  const { selectedSeriesId } = useTerminalSeriesStore();
  const config = getSeriesFeatureConfig(selectedSeriesId);
  const [summaries, setSummaries] = useState<DirSummary[]>([]);

  useEffect(() => {
    if (selectedSeriesId) {
      window.launcher.library.getDirSummary(selectedSeriesId as TerminalSeriesId).then((result) => {
        if (result.ok) {
          setSummaries(result.data);
        }
      });
    }
  }, [selectedSeriesId]);

  if (!selectedSeriesId || !config) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#111111] text-white/50">
        {t('launcher.series_not_selected', 'Please select a series first')}
      </div>
    );
  }

  const handleOpenDir = async (dirKey: string) => {
    await window.launcher.library.openDir(selectedSeriesId, dirKey);
  };

  return (
    <div className="flex flex-col h-full bg-[#111111]">
      <div className="p-10 pb-6 border-b border-white/5 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('launcher.feature_modal.library.title')}</h2>
          <p className="text-[14px] text-white/50 mt-2">{t('launcher.feature_modal.library.desc')}</p>
        </div>
      </div>
      
      <div className="flex-1 p-10 overflow-y-auto scrollbar-none">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {config.libraryDirs.map((dir, idx) => {
            const summary = summaries.find(s => s.dirKey === dir.key);
            return (
              <button 
                key={idx} 
                onClick={() => handleOpenDir(dir.key)}
                className="flex items-center p-5 rounded-xl border border-white/5 bg-[#1c1c1e] hover:bg-[#2c2c2e] transition-colors group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-lg bg-[#111] flex items-center justify-center text-white/50 group-hover:text-blue-400 transition-colors mr-4">
                  <dir.icon size={24} />
                </div>
                <div className="flex flex-col items-start">
                  <h3 className="text-[15px] text-white font-bold">{dir.key.toUpperCase()}</h3>
                  <span className="text-[13px] text-white/50 mt-0.5">
                    {summary ? summary.fileCount : 0} {t('launcher.feature_modal.library.files')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
