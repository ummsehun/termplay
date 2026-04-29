import React, { useState, useEffect } from 'react';
import { Search, Download, Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTerminalSeriesStore } from '../../terminal-series/stores/terminalSeriesStore';
import { getSeriesFeatureConfig, TerminalSeriesId } from '../../terminal-series/constants/seriesFeatureConfig';
import { AssetInfo } from '@shared/launcherTypes';

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

export const AssetsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { selectedSeriesId } = useTerminalSeriesStore();
  const [ytUrl, setYtUrl] = useState('');
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const config = getSeriesFeatureConfig(selectedSeriesId);

  useEffect(() => {
    if (selectedSeriesId && config?.assetMode === 'asset-list') {
      window.launcher.assets.list(selectedSeriesId as TerminalSeriesId).then((res) => {
        if (res.ok) {
          setAssets(res.data);
        }
      });
    }
  }, [selectedSeriesId, config?.assetMode]);

  if (!selectedSeriesId || !config) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#111111] text-white/50">
        {t('launcher.series_not_selected', 'Please select a series first')}
      </div>
    );
  }

  const isYoutubeMode = config.assetMode === 'youtube';

  const handleDownloadAsset = async (assetId: string) => {
    // Scaffold: Will hook up progress tracking later
    await window.launcher.assets.download(assetId);
  };

  return (
    <div className="flex flex-col h-full bg-[#111111]">
      <div className="p-10 pb-6 border-b border-white/5 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('launcher.feature_modal.assets.title')}</h2>
          <p className="text-[14px] text-white/50 mt-2">
            {t(`launcher.feature_modal.assets.desc_${selectedSeriesId}`)}
          </p>
        </div>
      </div>

      <div className="flex-1 p-10 overflow-y-auto scrollbar-none flex flex-col">
        {isYoutubeMode ? (
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
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-[#1c1c1e] hover:bg-[#2c2c2e] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#111] flex items-center justify-center text-white/50">
                    <Box size={20} />
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-[15px] text-white font-bold">{asset.name}</h4>
                    <span className="text-[13px] text-white/50 mt-0.5">{t('launcher.feature_modal.assets.type')}: {asset.type} • {t('launcher.feature_modal.assets.size')}: {formatSize(asset.sizeBytes)}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDownloadAsset(asset.id)}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[13px] flex items-center gap-2 transition-colors"
                >
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
};
