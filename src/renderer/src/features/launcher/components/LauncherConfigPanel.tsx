import React, { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SettingsLayout } from './SettingsLayout';
import { ToggleRow } from '../../../shared/components/ui/ToggleRow';
import { useTerminalSeriesStore } from '../../terminal-series/stores/terminalSeriesStore';
import { getSeriesFeatureConfig, TerminalSeriesId } from '../../terminal-series/constants/seriesFeatureConfig';
import { useLauncherConfigStore } from '../stores/launcherConfigStore';

export const LauncherConfigPanel: React.FC = () => {
  const { t } = useTranslation();
  const { selectedSeriesId, series: runtimeSeries } = useTerminalSeriesStore();
  const config = getSeriesFeatureConfig(selectedSeriesId);
  const { series, setSeriesOption } = useLauncherConfigStore();
  const [error, setError] = useState<string | null>(null);

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

  const currentSeriesState = series[selectedSeriesId as TerminalSeriesId];
  const currentRuntimeSeries = runtimeSeries.find((item) => item.id === selectedSeriesId);
  const installPath = currentRuntimeSeries?.installPath || currentSeriesState?.installPath || '';

  const handleBrowse = async () => {
    try {
      const result = await window.launcher.settings.selectInstallPath();
      if (result.ok) {
        await useLauncherConfigStore.getState().setInstallPath(selectedSeriesId as TerminalSeriesId, result.data.path);
        setError(null);
        return;
      }

      setError(result.error);
    } catch (e) {
      console.error('Failed to select install path', e);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <SettingsLayout title={t('launcher.feature_modal.launcher.title')} navItems={navItems}>
      <section className="space-y-3">
        <h3 className="text-[13px] font-bold text-white/50">{t('launcher.feature_modal.launcher.install_path')}</h3>
        <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1a1c]/80 to-[#121214]/80 backdrop-blur-md shadow-xl space-y-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
          
          <p className="text-white/60 text-[13px] leading-relaxed max-w-xl">{t('launcher.feature_modal.launcher.install_path_desc')}</p>
          
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-200 flex items-center gap-3">
              <span className="text-red-400 font-bold">!</span>
              {error}
            </div>
          )}
          
          <div className="flex gap-3">
            <input 
              type="text" 
              readOnly 
              value={installPath}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-[13px] text-white/80 font-mono outline-none shadow-inner transition-colors hover:border-white/20 focus:border-launcher-accent focus:bg-black/60"
            />
            <button 
              onClick={handleBrowse}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold tracking-wide rounded-xl transition-all text-[13px] shadow-sm hover:shadow-md"
            >
              {t('launcher.feature_modal.launcher.browse')}
            </button>
          </div>
        </div>
      </section>

      {config?.settings && config.settings.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[13px] font-bold text-white/50">{t('launcher.settings.advanced')}</h3>
          <div className="space-y-2">
            {config.settings.map(settingKey => {
              const labelKey = `launcher.feature_modal.launcher.${selectedSeriesId}.${settingKey === 'hwAccel' ? 'hw_accel' : settingKey === 'autoClean' ? 'auto_clean' : settingKey === 'highRes' ? 'high_res' : settingKey}`;
              const descKey = `${labelKey}_desc`;
              return (
                <div key={settingKey} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <ToggleRow 
                    label={t(labelKey)} 
                    description={t(descKey)} 
                    checked={currentSeriesState?.options[settingKey] || false} 
                    onCheckedChange={(checked) => setSeriesOption(selectedSeriesId as TerminalSeriesId, settingKey, checked)} 
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </SettingsLayout>
  );
};
