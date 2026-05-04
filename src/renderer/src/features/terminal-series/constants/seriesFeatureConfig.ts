import { FileMusic, Video as VideoIcon, Box, FileVideo, Database, RefreshCw } from 'lucide-react';
import { ElementType } from 'react';

export type TerminalSeriesId = 'gascii' | 'mienjine';
export type AssetMode = 'youtube' | 'asset-list';
export type LibraryDirKey = 'video' | 'audio' | 'backup' | 'camera' | 'glb' | 'music' | 'pmx' | 'stage' | 'sync' | 'vmd';
export type LauncherSettingKey = 'hwAccel' | 'autoClean' | 'highRes' | 'physics';

type LibraryDir = {
  key: LibraryDirKey;
  icon: ElementType;
};

export type SeriesFeatureConfig = {
  assetMode: AssetMode;
  libraryDirs: LibraryDir[];
  settings: LauncherSettingKey[];
  guideKey: TerminalSeriesId;
};

export const SERIES_FEATURE_CONFIG = {
  gascii: {
    assetMode: 'youtube',
    libraryDirs: [
      { key: 'video', icon: VideoIcon },
      { key: 'audio', icon: FileMusic }
    ],
    settings: ['hwAccel', 'autoClean'],
    guideKey: 'gascii',
  },
  mienjine: {
    assetMode: 'asset-list',
    libraryDirs: [
      { key: 'backup', icon: Database },
      { key: 'camera', icon: VideoIcon },
      { key: 'glb', icon: Box },
      { key: 'music', icon: FileMusic },
      { key: 'pmx', icon: Box },
      { key: 'stage', icon: Box },
      { key: 'sync', icon: RefreshCw },
      { key: 'vmd', icon: FileVideo }
    ],
    settings: ['highRes', 'physics'],
    guideKey: 'mienjine',
  },
} satisfies Record<TerminalSeriesId, SeriesFeatureConfig>;

export const getSeriesFeatureConfig = (seriesId: string | null): SeriesFeatureConfig | null => {
  if (seriesId === 'gascii') return SERIES_FEATURE_CONFIG.gascii;
  if (seriesId === 'mienjine') return SERIES_FEATURE_CONFIG.mienjine;
  return null;
};
