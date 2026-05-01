import React, { useState, useEffect } from 'react';
import { Search, Download, Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTerminalSeriesStore } from '../../terminal-series/stores/terminalSeriesStore';
import { getSeriesFeatureConfig, TerminalSeriesId } from '../../terminal-series/constants/seriesFeatureConfig';
import { AssetInfo, MediaDownloadProgress } from '@shared/launcherTypes';

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
  const [downloads, setDownloads] = useState<Record<string, import('@shared/launcherTypes').AssetDownloadProgress>>({});
  const [mediaJobUrl, setMediaJobUrl] = useState<string | null>(null);
  const [mediaProgress, setMediaProgress] = useState<MediaDownloadProgress | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
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

  useEffect(() => {
    const unsubAsset = window.launcher.assets.onProgress((event) => {
      setDownloads(prev => ({ ...prev, [event.assetId]: event }));
    });
    const unsubMedia = window.launcher.mediaDownload.onProgress((event) => {
      setMediaProgress(event);
      if (event.status === 'failed') {
        setMediaError(event.error ?? event.message ?? 'Download failed');
      }
    });
    return () => {
      unsubAsset();
      unsubMedia();
    };
  }, []);

  if (!selectedSeriesId || !config) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#111111] text-white/50">
        {t('launcher.series_not_selected', 'Please select a series first')}
      </div>
    );
  }

  const isYoutubeMode = config.assetMode === 'youtube';

  const handleDownloadAsset = async (assetId: string) => {
    await window.launcher.assets.download(selectedSeriesId as TerminalSeriesId, assetId);
  };

  const handleCancelDownload = async (downloadId: string) => {
    await window.launcher.mediaDownload.cancel(downloadId);
  };

  const handleDownloadMedia = async (format: 'mp4' | 'mp3') => {
    if (!ytUrl) return;
    setMediaError(null);
    setMediaProgress({
      jobId: 'pending',
      status: 'pending',
      percent: 0,
      message: 'Preparing media download',
    });
    const result = await window.launcher.mediaDownload.start({
      seriesId: selectedSeriesId as TerminalSeriesId,
      url: ytUrl,
      format,
    });

    if (!result.ok) {
      setMediaError(result.error);
      setMediaProgress({
        jobId: 'failed',
        status: 'failed',
        percent: 0,
        message: 'Media download setup failed',
        error: result.error,
      });
      return;
    }

    setMediaJobUrl(ytUrl);
  };

  const isMediaActive = mediaProgress && ['pending', 'validating', 'running', 'postprocessing'].includes(mediaProgress.status);
  const isMediaCompleted = mediaProgress?.status === 'completed';
  const isMediaCancelled = mediaProgress?.status === 'cancelled';
  const isMediaFailed = mediaProgress?.status === 'failed';

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
            
            {isMediaActive ? (
              <div className="w-full bg-[#1c1c1e] p-5 rounded-xl border border-white/5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm font-bold">
                    {mediaProgress.status === 'postprocessing'
                      ? t('launcher.feature_modal.assets.postprocessing', 'Post-processing...')
                      : mediaProgress.status === 'validating'
                        ? t('launcher.feature_modal.assets.validating', 'Validating...')
                        : t('launcher.feature_modal.assets.downloading', 'Downloading...')}
                  </span>
                  <button 
                    onClick={() => handleCancelDownload(mediaProgress.jobId)}
                    disabled={mediaProgress.jobId === 'pending'}
                    className="text-red-400 text-sm font-bold hover:text-red-300"
                  >
                    {t('launcher.feature_modal.assets.cancel', 'Cancel')}
                  </button>
                </div>
                <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full transition-all duration-300" 
                    style={{ width: `${mediaProgress.percent ?? 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[12px] text-white/40">
                  <span>{mediaProgress.message}</span>
                  <span>{mediaProgress.speedText || mediaProgress.etaText ? `${mediaProgress.speedText ?? ''} ${mediaProgress.etaText ? `ETA ${mediaProgress.etaText}` : ''}` : `${mediaProgress.percent ?? 0}%`}</span>
                </div>
              </div>
            ) : isMediaCompleted || isMediaCancelled || isMediaFailed ? (
              <div className={`w-full p-5 rounded-xl border flex flex-col items-center justify-center ${isMediaFailed ? 'bg-red-600/20 border-red-500/20' : isMediaCancelled ? 'bg-yellow-600/20 border-yellow-500/20' : 'bg-green-600/20 border-green-500/20'}`}>
                <span className={`font-bold ${isMediaFailed ? 'text-red-300' : isMediaCancelled ? 'text-yellow-300' : 'text-green-400'}`}>
                  {isMediaFailed
                    ? t('launcher.feature_modal.assets.failed', 'Failed')
                    : isMediaCancelled
                      ? t('launcher.feature_modal.assets.cancelled', 'Cancelled')
                      : t('launcher.feature_modal.assets.completed', 'Completed')}
                </span>
                {(mediaError || mediaProgress?.message) && (
                  <p className="mt-2 text-center text-[13px] text-white/50">{mediaError ?? mediaProgress?.message}</p>
                )}
                <button 
                  onClick={() => {
                    setMediaProgress(null);
                    setMediaError(null);
                    setMediaJobUrl(null);
                  }}
                  className="mt-2 text-white/50 text-sm hover:text-white"
                >
                  {t('launcher.feature_modal.assets.download_another', 'Download another')}
                </button>
              </div>
            ) : (
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => handleDownloadMedia('mp4')}
                  disabled={!ytUrl}
                  className="flex-1 py-4 bg-[#2c2c2e] hover:bg-[#3c3c3e] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-[14px] font-bold"
                >
                  <Download size={18} /> {t('launcher.feature_modal.assets.download_mp4')}
                </button>
                <button 
                  onClick={() => handleDownloadMedia('mp3')}
                  disabled={!ytUrl}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-[14px] font-bold"
                >
                  <Download size={18} /> {t('launcher.feature_modal.assets.download_mp3')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {assets.map((asset) => {
              const dl = downloads[asset.id];
              const isDownloading = dl && dl.status === 'downloading';
              const isCompleted = dl && dl.status === 'completed';

              return (
                <div key={asset.id} className="flex flex-col gap-2 p-4 rounded-xl border border-white/5 bg-[#1c1c1e] hover:bg-[#2c2c2e] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#111] flex items-center justify-center text-white/50">
                        <Box size={20} />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-[15px] text-white font-bold">{asset.name}</h4>
                        <span className="text-[13px] text-white/50 mt-0.5">{t('launcher.feature_modal.assets.type')}: {asset.type} • {t('launcher.feature_modal.assets.size')}: {formatSize(asset.sizeBytes)}</span>
                      </div>
                    </div>
                    
                    {isCompleted ? (
                      <div className="px-5 py-2.5 rounded-lg bg-green-600/20 text-green-400 font-bold text-[13px] flex items-center gap-2">
                        {t('launcher.feature_modal.assets.completed', 'Completed')}
                      </div>
                    ) : isDownloading ? (
                      <button 
                        onClick={() => handleCancelDownload(dl.downloadId)}
                        className="px-5 py-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 font-bold text-[13px] flex items-center gap-2 transition-colors"
                      >
                        {t('launcher.feature_modal.assets.cancel', 'Cancel')}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleDownloadAsset(asset.id)}
                        className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[13px] flex items-center gap-2 transition-colors"
                      >
                        <Download size={16} />
                        <span>{t('launcher.feature_modal.assets.download')}</span>
                      </button>
                    )}
                  </div>
                  
                  {isDownloading && (
                    <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-blue-500 h-full transition-all duration-300" 
                        style={{ width: `${dl.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
