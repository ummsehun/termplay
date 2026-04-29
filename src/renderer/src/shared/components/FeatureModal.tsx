import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/uiStore';
import { useTerminalSeriesStore } from '../../features/terminal-series/stores/terminalSeriesStore';
import { X, Globe, HardDrive, Rocket, Library, Package, BookOpen, Search, Download, Folder, FileMusic, Video as VideoIcon, Box, FileVideo } from 'lucide-react';
import { cn } from '../lib/cn';

export const FeatureModal: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { activeModal, closeModal } = useUIStore();
  const { selectedSeriesId, series } = useTerminalSeriesStore();
  const [ytUrl, setYtUrl] = useState('');

  if (!activeModal) return null;

  const currentSeries = series.find(s => s.id === selectedSeriesId);
  const isGascii = selectedSeriesId === 'gascii';

  const renderLauncherConfig = () => (
    <div className="flex-1 flex flex-col p-8 space-y-8">
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <Rocket size={32} className="text-launcher-accent" />
        <div>
          <h2 className="text-2xl font-bold text-white">{currentSeries?.displayName} {t('launcher.launcher_action')}</h2>
          <p className="text-white/50 text-sm">Configure installation path and execution arguments.</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Install Path</h3>
        <div className="flex gap-2">
          <input 
            type="text" 
            readOnly 
            value={`C:\\Program Files\\Lanchaer\\${currentSeries?.id}`}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 font-mono outline-none"
          />
          <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/5 transition-colors">
            Browse
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Core Settings</h3>
        {isGascii ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-white/10 bg-black/20 flex justify-between items-center">
              <span className="text-white/80">Hardware Acceleration</span>
              <input type="checkbox" defaultChecked className="accent-launcher-accent w-5 h-5" />
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-black/20 flex justify-between items-center">
              <span className="text-white/80">Auto-clean Temp Files</span>
              <input type="checkbox" defaultChecked className="accent-launcher-accent w-5 h-5" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-white/10 bg-black/20 flex justify-between items-center">
              <span className="text-white/80">High-Res Rendering</span>
              <input type="checkbox" defaultChecked className="accent-launcher-accent w-5 h-5" />
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-black/20 flex justify-between items-center">
              <span className="text-white/80">Enable Physics Engine</span>
              <input type="checkbox" defaultChecked className="accent-launcher-accent w-5 h-5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderLibrary = () => {
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
      <div className="flex-1 flex flex-col p-8 space-y-6">
        <div className="flex items-center gap-4 border-b border-white/10 pb-6">
          <Library size={32} className="text-purple-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Local Library Explorer</h2>
            <p className="text-white/50 text-sm">Manage assets stored in your local directories.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
          {dirs.map((dir, idx) => (
            <button key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-black/40 hover:bg-white/5 transition-all group text-left">
              <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-white/50 group-hover:text-white transition-colors">
                <dir.icon size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold uppercase tracking-wider">{dir.name}</h3>
                <span className="text-xs text-white/50 font-mono">{dir.count} files</span>
              </div>
              <Folder className="text-white/20 group-hover:text-launcher-accent transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderAssets = () => (
    <div className="flex-1 flex flex-col p-8 space-y-6">
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <Package size={32} className="text-emerald-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Asset Downloader</h2>
          <p className="text-white/50 text-sm">{isGascii ? 'Extract media directly from YouTube URLs.' : 'Download official standard assets.'}</p>
        </div>
      </div>

      {isGascii ? (
        <div className="space-y-6 flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-white mb-2">YouTube Extraction Engine</h3>
            <p className="text-sm text-white/50">Paste a YouTube URL below to extract media to your library.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input 
              type="text" 
              placeholder="https://youtube.com/watch?v=..."
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              className="w-full bg-black/40 border border-white/20 rounded-xl pl-12 pr-4 py-4 text-white focus:border-launcher-accent outline-none transition-colors"
            />
          </div>
          <div className="flex gap-4">
            <button className="flex-1 py-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold rounded-xl border border-emerald-500/30 transition-colors flex items-center justify-center gap-2">
              <Download size={18} /> MP4 Video
            </button>
            <button className="flex-1 py-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-bold rounded-xl border border-blue-500/30 transition-colors flex items-center justify-center gap-2">
              <Download size={18} /> MP3 Audio
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto pr-2 pb-4">
          {[
            { name: 'Default Anime Stage.glb', type: 'Environment', size: '12.4 MB' },
            { name: 'Standard Character Base.pmx', type: 'Model', size: '4.2 MB' },
            { name: 'Sample Background Track.mp3', type: 'Music', size: '3.1 MB' },
            { name: 'Dynamic Camera Pan.vmd', type: 'Animation', size: '150 KB' },
          ].map((asset, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-black/20 hover:bg-black/40 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                  <Package size={18} />
                </div>
                <div>
                  <h4 className="text-white font-medium">{asset.name}</h4>
                  <span className="text-xs text-white/50">{asset.type} • {asset.size}</span>
                </div>
              </div>
              <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                <Download size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderGuide = () => (
    <div className="flex-1 flex flex-col p-8 space-y-6">
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <BookOpen size={32} className="text-orange-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Documentation & Guide</h2>
          <p className="text-white/50 text-sm">Learn more about the core mechanics of this engine.</p>
        </div>
      </div>

      <div className="bg-black/40 border border-white/10 rounded-2xl p-8 flex-1 overflow-y-auto">
        {isGascii ? (
          <div className="space-y-6 text-white/80 leading-relaxed">
            <h3 className="text-xl font-bold text-white">What is Gascii?</h3>
            <p>
              Gascii is a high-performance terminal-based media extraction and processing utility.
              It converts standard video pipelines into lightweight ASCII matrix displays directly inside your terminal environment.
            </p>
            <h3 className="text-xl font-bold text-white pt-4">Core Features</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Direct YouTube API integration for MP4/MP3 retrieval.</li>
              <li>Real-time hardware-accelerated video-to-ascii conversion.</li>
              <li>Seamless audio-visual synchronization without UI overhead.</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-6 text-white/80 leading-relaxed">
            <h3 className="text-xl font-bold text-white">What is MiEnjine?</h3>
            <p>
              MiEnjine is a specialized 3D rendering engine built for the terminal and web, designed to render GLB and MMD (PMX/VMD) files with extreme efficiency.
            </p>
            <h3 className="text-xl font-bold text-white pt-4">Core Features</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Native support for PMX character models and VMD motion files.</li>
              <li>Integrated audio playback synced with camera and stage animations.</li>
              <li>Advanced lighting and physics calculation within a minimal footprint.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeModal) {
      case 'settings':
        return (
          <div className="flex w-full h-full">
            <div className="w-56 bg-black/40 border-r border-white/5 flex flex-col p-4">
              <h2 className="text-xl font-bold text-white mb-6 pl-2">{t('launcher.settings.title')}</h2>
              <div className="flex flex-col gap-2">
                <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 text-white font-medium transition-colors">
                  <Globe size={18} />
                  {t('launcher.settings.general')}
                </button>
                <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/50 hover:bg-white/5 hover:text-white transition-colors cursor-not-allowed">
                  <HardDrive size={18} />
                  Storage
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col relative">
              <div className="flex-1 overflow-y-auto p-8 pt-12 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('launcher.settings.language')}</h3>
                  <div className="flex gap-4">
                    {['ko', 'en', 'ja'].map(lang => (
                      <button
                        key={lang}
                        onClick={() => i18n.changeLanguage(lang)}
                        className={cn(
                          "px-6 py-3 rounded-xl border font-medium transition-all",
                          i18n.language === lang 
                            ? "bg-launcher-accent/20 border-launcher-accent text-launcher-accent shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                            : "bg-white/5 border-white/10 text-white/70 hover:border-white/30 hover:text-white"
                        )}
                      >
                        {lang === 'ko' ? '한국어' : lang === 'en' ? 'English' : '日本語'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('launcher.settings.install_path')}</h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value="C:\Program Files\Lanchaer"
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 font-mono outline-none"
                    />
                    <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/5 transition-colors">
                      {t('launcher.settings.browse')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'launcher': return renderLauncherConfig();
      case 'library': return renderLibrary();
      case 'assets': return renderAssets();
      case 'guide': return renderGuide();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-8">
      <div className="w-[800px] h-[550px] bg-[#121212]/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <button 
          onClick={closeModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors z-10"
        >
          <X size={18} />
        </button>

        {renderContent()}

      </div>
    </div>
  );
};
