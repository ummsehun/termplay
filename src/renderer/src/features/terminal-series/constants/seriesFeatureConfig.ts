import { FileMusic, Video as VideoIcon, Box, FileVideo } from 'lucide-react';
import { ElementType } from 'react';

type LibraryDir = {
  name: string;
  icon: ElementType;
};

type SeriesConfig = {
  assetMode: 'youtube' | 'asset-list';
  libraryDirs: LibraryDir[];
  settings: string[];
  guideKey: string;
};

export const SERIES_FEATURE_CONFIG: Record<string, SeriesConfig> = {
  gascii: {
    assetMode: 'youtube',
    libraryDirs: [
      { name: 'video', icon: VideoIcon },
      { name: 'audio', icon: FileMusic }
    ],
    settings: ['hwAccel', 'autoClean'],
    guideKey: 'gascii',
  },
  mienjine: {
    assetMode: 'asset-list',
    libraryDirs: [
      { name: 'music', icon: FileMusic },
      { name: 'glb', icon: Box },
      { name: 'camera', icon: VideoIcon },
      { name: 'stage', icon: Box },
      { name: 'vmd', icon: FileVideo },
      { name: 'pmx', icon: Box }
    ],
    settings: ['highRes', 'physics'],
    guideKey: 'mienjine',
  },
} as const;

export const getSeriesFeatureConfig = (seriesId: string | null): SeriesConfig | null => {
  if (seriesId === 'gascii') return SERIES_FEATURE_CONFIG.gascii;
  if (seriesId === 'mienjine') return SERIES_FEATURE_CONFIG.mienjine;
  return null;
};
