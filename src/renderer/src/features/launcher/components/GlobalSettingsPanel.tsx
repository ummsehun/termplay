import React, { useState } from 'react';
import { Globe, HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SettingsLayout } from './SettingsLayout';
import { ToggleRow } from '../../../shared/components/ui/ToggleRow';
import { cn } from '../../../shared/lib/cn';

export const GlobalSettingsPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [autoUpdate, setAutoUpdate] = useState(true);

  const navItems = [
    { id: 'general', label: t('launcher.settings.general'), icon: Globe, isActive: true },
    { id: 'storage', label: t('launcher.settings.storage'), icon: HardDrive, disabled: true }
  ];

  return (
    <SettingsLayout title={t('launcher.settings.title')} navItems={navItems}>
      <section className="space-y-3">
        <h3 className="text-[13px] font-bold text-white/50">{t('launcher.settings.language')}</h3>
        <div className="p-6 rounded-xl border border-white/5 bg-[#1c1c1e]">
          <div className="flex gap-4">
            {['ko', 'en', 'ja'].map(lang => (
              <button
                key={lang}
                onClick={() => i18n.changeLanguage(lang)}
                className={cn(
                  "px-6 py-3 rounded-lg border font-medium transition-all text-[14px]",
                  i18n.language === lang 
                    ? "bg-blue-500/20 border-blue-500 text-blue-400" 
                    : "bg-[#111] border-white/10 text-white/50 hover:border-white/30 hover:text-white"
                )}
              >
                {lang === 'ko' ? '한국어' : lang === 'en' ? 'English' : '日本語'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[13px] font-bold text-white/50">{t('launcher.settings.advanced')}</h3>
        <div className="space-y-3">
          <ToggleRow 
            label={t('launcher.settings.auto_update')} 
            description={t('launcher.settings.auto_update_desc')} 
            checked={autoUpdate} 
            onCheckedChange={setAutoUpdate} 
          />
        </div>
      </section>
    </SettingsLayout>
  );
};
