import { FileMusic, Video as VideoIcon, Box, FileVideo } from 'lucide-react';
import { ElementType } from 'react';

export type TerminalSeriesId = 'gascii' | 'mienjine';
export type AssetMode = 'youtube' | 'asset-list';
export type LibraryDirKey = 'video' | 'audio' | 'music' | 'glb' | 'camera' | 'stage' | 'vmd' | 'pmx';
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
      { key: 'music', icon: FileMusic },
      { key: 'glb', icon: Box },
      { key: 'camera', icon: VideoIcon },
      { key: 'stage', icon: Box },
      { key: 'vmd', icon: FileVideo },
      { key: 'pmx', icon: Box }
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
