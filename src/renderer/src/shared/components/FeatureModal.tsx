import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/uiStore';
import { useTerminalSeriesStore } from '../../features/terminal-series/stores/terminalSeriesStore';
import { X, Globe, HardDrive, Rocket, Library, Package, BookOpen, Search, Download, Folder, FileMusic, Video as VideoIcon, Box, FileVideo, Settings2 } from 'lucide-react';
import { cn } from '../lib/cn';

export const FeatureModal: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { activeModal, closeModal } = useUIStore();
  const { selectedSeriesId, series } = useTerminalSeriesStore();
  const [ytUrl, setYtUrl] = useState('');

  if (!activeModal) return null;

  const currentSeries = series.find(s => s.id === selectedSeriesId);
  const isGascii = selectedSeriesId === 'gascii';

  // Toggle component matching the screenshot exactly
  const ToggleRow = ({ label, desc, defaultChecked = false }: { label: string, desc: string, defaultChecked?: boolean }) => (
    <div className="flex items-center justify-between p-5 rounded-xl border border-white/5 bg-[#1c1c1e]">
      <div className="flex flex-col pr-6">
        <span className="text-[15px] font-bold text-white/90">{label}</span>
        <span className="text-[13px] text-white/50 mt-1">{desc}</span>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
        <div className="w-11 h-6 bg-[#333] rounded-full peer peer-checked:bg-blue-500 transition-colors"></div>
        <div className="absolute left-[3px] top-[3px] bg-white w-[18px] h-[18px] rounded-full transition-transform peer-checked:translate-x-5"></div>
      </label>
    </div>
  );

  const renderLauncherConfig = () => (
    <div className="flex w-full h-full bg-[#111111]">
      {/* Settings Left Sidebar */}
      <div className="w-[240px] bg-[#0a0a0a] border-r border-white/5 flex flex-col p-4">
        <h2 className="text-2xl font-bold text-white mb-8 pl-4 mt-6">{t('launcher.feature_modal.launcher.title')}</h2>
        
        <div className="flex flex-col gap-1">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 text-blue-400 font-bold border-l-4 border-blue-500 transition-colors">
            <Settings2 size={18} />
            {t('launcher.settings.game_settings')}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-none">
          {/* Install Path Section */}
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

          {/* Engine Settings Section */}
          <section className="space-y-3">
            <h3 className="text-[13px] font-bold text-white/50">{t('launcher.settings.advanced')}</h3>
            <div className="space-y-3">
              {isGascii ? (
                <>
                  <ToggleRow label={t('launcher.feature_modal.launcher.gascii.hw_accel')} desc={t('launcher.feature_modal.launcher.gascii.hw_accel_desc')} defaultChecked />
                  <ToggleRow label={t('launcher.feature_modal.launcher.gascii.auto_clean')} desc={t('launcher.feature_modal.launcher.gascii.auto_clean_desc')} defaultChecked />
                </>
              ) : (
                <>
                  <ToggleRow label={t('launcher.feature_modal.launcher.mienjine.high_res')} desc={t('launcher.feature_modal.launcher.mienjine.high_res_desc')} defaultChecked />
                  <ToggleRow label={t('launcher.feature_modal.launcher.mienjine.physics')} desc={t('launcher.feature_modal.launcher.mienjine.physics_desc')} defaultChecked />
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  const renderGlobalSettings = () => (
    <div className="flex w-full h-full bg-[#111111]">
      <div className="w-[240px] bg-[#0a0a0a] border-r border-white/5 flex flex-col p-4">
        <h2 className="text-2xl font-bold text-white mb-8 pl-4 mt-6">{t('launcher.settings.title')}</h2>
        <div className="flex flex-col gap-1">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 text-blue-400 font-bold border-l-4 border-blue-500 transition-colors">
            <Globe size={18} />
            {t('launcher.settings.general')}
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 border-transparent text-white/50 hover:bg-white/5 hover:text-white transition-colors cursor-not-allowed font-medium">
            <HardDrive size={18} />
            {t('launcher.settings.storage')}
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-none">
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
              <ToggleRow label={t('launcher.settings.auto_update')} desc={t('launcher.settings.auto_update_desc')} defaultChecked />
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  const renderLibrary = () => {
    // Keep Library relatively similar but flatter design
    const gasciiDirs = [
      { name: 'video', icon: VideoIcon, count: 12 },
      { name: 'audio', icon: FileMusic, count: 45 }
    ];
    const mienjineDirs = [
      { name: 'music', icon: FileMusic, count: 8 },
      { name: 'glb', icon: Box, count: 24 },
      { name: 'camera', icon: VideoIcon, count: 5 },
      { name: 'stage', icon: Box, count: 12 },
      { name: 'vmd', icon: FileVideo, count: 32 },
      { name: 'pmx', icon: Box, count: 18 }
    ];
    const dirs = isGascii ? gasciiDirs : mienjineDirs;

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
            {dirs.map((dir, idx) => (
              <button key={idx} className="flex items-center p-5 rounded-xl border border-white/5 bg-[#1c1c1e] hover:bg-[#2c2c2e] transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-[#111] flex items-center justify-center text-white/50 group-hover:text-blue-400 transition-colors mr-4">
                  <dir.icon size={24} />
                </div>
                <div className="flex flex-col items-start">
                  <h3 className="text-[15px] text-white font-bold">{dir.name.toUpperCase()}</h3>
                  <span className="text-[13px] text-white/50 mt-0.5">{dir.count} {t('launcher.feature_modal.library.files')}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAssets = () => (
    <div className="flex flex-col h-full bg-[#111111]">
      <div className="p-10 pb-6 border-b border-white/5 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('launcher.feature_modal.assets.title')}</h2>
          <p className="text-[14px] text-white/50 mt-2">
            {isGascii ? t('launcher.feature_modal.assets.desc_gascii') : t('launcher.feature_modal.assets.desc_mienjine')}
          </p>
        </div>
      </div>

      <div className="flex-1 p-10 overflow-y-auto scrollbar-none flex flex-col">
        {isGascii ? (
          <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full space-y-6">
            <div className="relative flex items-center bg-[#1c1c1e] rounded-xl border border-white/5 overflow-hidden">
              <div className="pl-5 text-white/40">
                <Search size={20} />
              </div>
              <input 
                type="text" 
                placeholder={t('launcher.feature_modal.assets.yt_placeholder')}
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                className="w-full bg-transparent px-4 py-4 text-[15px] text-white font-medium outline-none placeholder:text-white/30"
              />
            </div>
            
            <div className="flex gap-4 w-full">
              <button className="flex-1 py-4 bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-[14px] font-bold">
                <Download size={18} /> {t('launcher.feature_modal.assets.download_mp4')}
              </button>
              <button className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-[14px] font-bold">
                <Download size={18} /> {t('launcher.feature_modal.assets.download_mp3')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { name: 'Default Anime Stage.glb', type: 'Environment', size: '12.4 MB' },
              { name: 'Standard Character Base.pmx', type: 'Model', size: '4.2 MB' },
              { name: 'Sample Background Track.mp3', type: 'Music', size: '3.1 MB' },
              { name: 'Dynamic Camera Pan.vmd', type: 'Animation', size: '150 KB' },
            ].map((asset, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-[#1c1c1e] hover:bg-[#2c2c2e] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#111] flex items-center justify-center text-white/50">
                    <Box size={20} />
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-[15px] text-white font-bold">{asset.name}</h4>
                    <span className="text-[13px] text-white/50 mt-0.5">{t('launcher.feature_modal.assets.type')}: {asset.type} • {t('launcher.feature_modal.assets.size')}: {asset.size}</span>
                  </div>
                </div>
                <button className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[13px] flex items-center gap-2 transition-colors">
                  <Download size={16} />
                  <span>{t('launcher.feature_modal.assets.download')}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderGuide = () => (
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
            {isGascii ? (
              <>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{t('launcher.feature_modal.guide.gascii_title')}</h3>
                  <p className="text-[15px] text-white/70 leading-relaxed">
                    {t('launcher.feature_modal.guide.gascii_desc')}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-[13px] font-bold text-white/50 uppercase mb-4">{t('launcher.feature_modal.guide.gascii_features')}</h4>
                  <ul className="space-y-3">
                    {[
                      t('launcher.feature_modal.guide.gascii_f1'),
                      t('launcher.feature_modal.guide.gascii_f2'),
                      t('launcher.feature_modal.guide.gascii_f3')
                    ].map((feat, i) => (
                      <li key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#111] border border-white/5">
                        <div className="w-6 h-6 rounded-md bg-[#2c2c2e] text-white/50 flex items-center justify-center shrink-0 font-bold text-[12px]">{i + 1}</div>
                        <span className="text-[14px] text-white/80">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{t('launcher.feature_modal.guide.mienjine_title')}</h3>
                  <p className="text-[15px] text-white/70 leading-relaxed">
                    {t('launcher.feature_modal.guide.mienjine_desc')}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-[13px] font-bold text-white/50 uppercase mb-4">{t('launcher.feature_modal.guide.mienjine_features')}</h4>
                  <ul className="space-y-3">
                    {[
                      t('launcher.feature_modal.guide.mienjine_f1'),
                      t('launcher.feature_modal.guide.mienjine_f2'),
                      t('launcher.feature_modal.guide.mienjine_f3')
                    ].map((feat, i) => (
                      <li key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#111] border border-white/5">
                        <div className="w-6 h-6 rounded-md bg-[#2c2c2e] text-white/50 flex items-center justify-center shrink-0 font-bold text-[12px]">{i + 1}</div>
                        <span className="text-[14px] text-white/80">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeModal) {
      case 'settings': return renderGlobalSettings();
      case 'launcher': return renderLauncherConfig();
      case 'library': return renderLibrary();
      case 'assets': return renderAssets();
      case 'guide': return renderGuide();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-8 sm:p-12 md:p-16 lg:p-24">
      <div className="w-full h-full max-w-5xl max-h-[750px] bg-[#111111] border border-white/5 rounded-[20px] shadow-2xl flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Flat grey circular close button matching screenshot style */}
        <button 
          onClick={closeModal}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#2c2c2e] hover:bg-[#3c3c3e] flex items-center justify-center text-white/70 hover:text-white transition-colors z-50"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        {renderContent()}

      </div>
    </div>
  );
};
