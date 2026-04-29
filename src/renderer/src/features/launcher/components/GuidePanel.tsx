import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminalSeriesStore } from '../../terminal-series/stores/terminalSeriesStore';
import { getSeriesFeatureConfig } from '../../terminal-series/constants/seriesFeatureConfig';

export const GuidePanel: React.FC = () => {
  const { t } = useTranslation();
  const { selectedSeriesId } = useTerminalSeriesStore();
  const config = getSeriesFeatureConfig(selectedSeriesId);

  if (!selectedSeriesId || !config) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#111111] text-white/50">
        {t('launcher.series_not_selected', 'Please select a series first')}
      </div>
    );
  }

  const gKey = config.guideKey;

  return (
    <div className="flex flex-col h-full bg-[#111111]">
      <div className="p-10 pb-6 border-b border-white/5 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('launcher.feature_modal.guide.title')}</h2>
          <p className="text-[14px] text-white/50 mt-2">{t('launcher.feature_modal.guide.desc')}</p>
        </div>
      </div>

      <div className="flex-1 p-10 overflow-y-auto scrollbar-none">
        <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-8">
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">{t(`launcher.feature_modal.guide.${gKey}_title`)}</h3>
              <p className="text-[15px] text-white/70 leading-relaxed">
                {t(`launcher.feature_modal.guide.${gKey}_desc`)}
              </p>
            </div>
            
            <div>
              <h4 className="text-[13px] font-bold text-white/50 uppercase mb-4">{t(`launcher.feature_modal.guide.${gKey}_features`)}</h4>
              <ul className="space-y-3">
                {[1, 2, 3].map((num) => {
                  const featureText = t(`launcher.feature_modal.guide.${gKey}_f${num}`);
                  return (
                    <li key={num} className="flex items-center gap-3 p-3 rounded-lg bg-[#111] border border-white/5">
                      <div className="w-6 h-6 rounded-md bg-[#2c2c2e] text-white/50 flex items-center justify-center shrink-0 font-bold text-[12px]">{num}</div>
                      <span className="text-[14px] text-white/80">{featureText}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
