import React, { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SettingsLayout } from './SettingsLayout';
import { ToggleRow } from '../../../shared/components/ui/ToggleRow';
import { useTerminalSeriesStore } from '../../terminal-series/stores/terminalSeriesStore';
import { getSeriesFeatureConfig } from '../../terminal-series/constants/seriesFeatureConfig';

export const LauncherConfigPanel: React.FC = () => {
  const { t } = useTranslation();
  const { selectedSeriesId, series } = useTerminalSeriesStore();
  const currentSeries = series.find(s => s.id === selectedSeriesId);
  const config = getSeriesFeatureConfig(selectedSeriesId);

  // Example local state for toggles (will connect to a store/IPC later)
  const [settingsValues, setSettingsValues] = useState<Record<string, boolean>>({
    hwAccel: true, autoClean: true, highRes: true, physics: true
  });

  const updateSetting = (key: string, value: boolean) => {
    setSettingsValues(prev => ({ ...prev, [key]: value }));
  };

  const navItems = [
    { id: 'game_settings', label: t('launcher.settings.game_settings'), icon: Settings2, isActive: true }
  ];

  if (!selectedSeriesId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#111111] text-white/50">
        {t('launcher.series_not_selected', 'Please select a series first')}
      </div>
    );
  }

  return (
    <SettingsLayout title={t('launcher.feature_modal.launcher.title')} navItems={navItems}>
      <section className="space-y-3">
        <h3 className="text-[13px] font-bold text-white/50">{t('launcher.feature_modal.launcher.install_path')}</h3>
        <div className="p-6 rounded-xl border border-white/5 bg-[#1c1c1e] space-y-5">
          <p className="text-white/70 text-[14px]">{t('launcher.feature_modal.launcher.install_path_desc')}</p>
          <div className="flex gap-3">
            <input 
              type="text" 
              readOnly 
              value={`C:\\Program Files\\Lanchaer\\${currentSeries?.id}`}
              className="flex-1 bg-[#111111] border border-white/5 rounded-lg px-4 py-2.5 text-[14px] text-white/90 font-mono outline-none"
            />
            <button className="px-6 py-2.5 bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white font-medium rounded-lg transition-colors text-[14px]">
              {t('launcher.feature_modal.launcher.browse')}
            </button>
          </div>
        </div>
      </section>

      {config?.settings && config.settings.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[13px] font-bold text-white/50">{t('launcher.settings.advanced')}</h3>
          <div className="space-y-3">
            {config.settings.map(settingKey => {
              const labelKey = `launcher.feature_modal.launcher.${selectedSeriesId}.${settingKey === 'hwAccel' ? 'hw_accel' : settingKey === 'autoClean' ? 'auto_clean' : settingKey === 'highRes' ? 'high_res' : settingKey}`;
              const descKey = `${labelKey}_desc`;
              return (
                <ToggleRow 
                  key={settingKey}
                  label={t(labelKey)} 
                  description={t(descKey)} 
                  checked={settingsValues[settingKey] || false} 
                  onCheckedChange={(checked) => updateSetting(settingKey, checked)} 
                />
              );
            })}
          </div>
        </section>
      )}
    </SettingsLayout>
  );
};
