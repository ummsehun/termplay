import { platform } from 'node:os';
import { type AssetInfo, type LibraryDirKey, type TerminalSeriesId } from '@shared/launcherTypes';

export type RuntimePlatformKey = 'darwin-arm64' | 'linux-x64';

export type ReleaseAssetDefinition = {
  name: string;
  size: number;
  digest: `sha256:${string}`;
};

export type StaticReleaseDefinition = {
  owner: string;
  repo: string;
  tag: string;
  assets: Partial<Record<RuntimePlatformKey, ReleaseAssetDefinition>>;
};

export type LaunchSecurityPolicy = {
  macos: 'sandbox-required' | 'sandbox-if-enabled' | 'direct';
  linux: 'sandbox-required' | 'direct';
};

export type SeriesDefinition = {
  id: TerminalSeriesId;
  displayName: string;
  installDirName: string;
  assetRootName: 'assets';
  libraryDirs: readonly LibraryDirKey[];
  requiredAssetGroups: readonly (readonly LibraryDirKey[])[];
  launchSecurity: LaunchSecurityPolicy;
  release?: StaticReleaseDefinition;
};

export const getRuntimePlatformKey = (): RuntimePlatformKey => {
  if (platform() === 'darwin' && process.arch === 'arm64') {
    return 'darwin-arm64';
  }

  if (platform() === 'linux' && process.arch === 'x64') {
    return 'linux-x64';
  }

  throw new Error(`Unsupported platform: ${platform()} ${process.arch}`);
};

export const buildGithubReleaseAssetUrl = (release: StaticReleaseDefinition, assetName: string): string =>
  `https://github.com/${release.owner}/${release.repo}/releases/download/${release.tag}/${assetName}`;

export const SERIES_DEFINITIONS = {
  gascii: {
    id: 'gascii',
    displayName: 'Gascii',
    installDirName: 'gascii',
    assetRootName: 'assets',
    libraryDirs: ['video', 'audio'],
    requiredAssetGroups: [['video'], ['audio']],
    launchSecurity: {
      macos: 'sandbox-if-enabled',
      linux: 'sandbox-required',
    },
  },
  mienjine: {
    id: 'mienjine',
    displayName: 'Mienjine',
    installDirName: 'mienjine',
    assetRootName: 'assets',
    libraryDirs: ['backup', 'camera', 'glb', 'music', 'pmx', 'stage', 'sync', 'vmd'],
    requiredAssetGroups: [['glb', 'pmx']],
    launchSecurity: {
      macos: 'sandbox-if-enabled',
      linux: 'sandbox-required',
    },
    release: {
      owner: 'ummsehun',
      repo: 'mienjine',
      tag: 'v0.1.5',
      assets: {
        'darwin-arm64': {
          name: 'terminal-miku3d-macos-arm64.tar.gz',
          size: 3_040_000,
          digest: 'sha256:96a373be7f07023f15226687a867038a7a9912285194c8662e917143dd13dfe4',
        },
        'linux-x64': {
          name: 'terminal-miku3d-linux-x64.tar.gz',
          size: 3_870_000,
          digest: 'sha256:e861e9e9a877ea8b67176296c3ef6ac3e373ac91269dfc67450abe8448f3377f',
        },
      },
    },
  },
} as const satisfies Record<TerminalSeriesId, SeriesDefinition>;

export const SERIES_ASSET_CATALOG = {
  gascii: [],
  mienjine: [
    {
      id: 'khronos-boombox-glb',
      name: 'Boom Box',
      type: 'model/gltf-binary',
      sizeBytes: 10_614_184,
      fileName: 'BoomBox.glb',
      targetDir: 'glb',
      description: 'Khronos glTF Sample Asset. CC0 1.0 Universal.',
      checksum: 'sha256:f8b918445ebdd006768232205a62f5182d2208ca57f84c6ccc084943c0bc8f15',
      downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoomBox/glTF-Binary/BoomBox.glb',
    },
  ],
} as const satisfies Record<TerminalSeriesId, AssetInfo[]>;

export const validateSeriesDefinitions = (): void => {
  const definitions = Object.values(SERIES_DEFINITIONS) as readonly SeriesDefinition[];

  for (const definition of definitions) {
    assertNonEmpty(definition.id, 'series id');
    assertNonEmpty(definition.displayName, `${definition.id} displayName`);
    assertNonEmpty(definition.installDirName, `${definition.id} installDirName`);

    const libraryDirSet = new Set<LibraryDirKey>(definition.libraryDirs);
    if (libraryDirSet.size !== definition.libraryDirs.length) {
      throw new Error(`${definition.id} libraryDirs contains duplicates`);
    }

    for (const group of definition.requiredAssetGroups) {
      if (group.length === 0) {
        throw new Error(`${definition.id} requiredAssetGroups contains an empty group`);
      }

      for (const dir of group) {
        if (!libraryDirSet.has(dir)) {
          throw new Error(`${definition.id} required asset dir is not in libraryDirs: ${dir}`);
        }
      }
    }

    if (definition.release) {
      assertNonEmpty(definition.release.owner, `${definition.id} release owner`);
      assertNonEmpty(definition.release.repo, `${definition.id} release repo`);
      assertNonEmpty(definition.release.tag, `${definition.id} release tag`);

      for (const [platformKey, asset] of Object.entries(definition.release.assets)) {
        if (!asset) {
          throw new Error(`${definition.id} release asset is empty for ${platformKey}`);
        }

        assertNonEmpty(asset.name, `${definition.id} release asset name for ${platformKey}`);
        if (!/^sha256:[a-f0-9]{64}$/i.test(asset.digest)) {
          throw new Error(`${definition.id} release asset has invalid digest for ${platformKey}`);
        }

        if (!Number.isFinite(asset.size) || asset.size <= 0) {
          throw new Error(`${definition.id} release asset has invalid size for ${platformKey}`);
        }
      }
    }
  }

  for (const [seriesId, assets] of Object.entries(SERIES_ASSET_CATALOG) as Array<[TerminalSeriesId, readonly AssetInfo[]]>) {
    const definition = SERIES_DEFINITIONS[seriesId];
    const libraryDirSet = new Set<LibraryDirKey>(definition.libraryDirs);
    const ids = new Set<string>();

    for (const asset of assets) {
      assertNonEmpty(asset.id, `${seriesId} asset id`);
      if (ids.has(asset.id)) {
        throw new Error(`${seriesId} asset catalog contains duplicate id: ${asset.id}`);
      }
      ids.add(asset.id);

      if (!libraryDirSet.has(asset.targetDir)) {
        throw new Error(`${seriesId} asset targetDir is not allowed: ${asset.targetDir}`);
      }

      if (asset.downloadUrl) {
        assertHttpsUrl(asset.downloadUrl, `${seriesId} asset downloadUrl for ${asset.id}`);

        if (!/^sha256:[a-f0-9]{64}$/i.test(asset.checksum ?? '')) {
          throw new Error(`${seriesId} downloadable asset must include a SHA-256 checksum: ${asset.id}`);
        }
      }
    }
  }
};

const assertNonEmpty = (value: string, label: string): void => {
  if (value.trim().length === 0) {
    throw new Error(`Invalid ${label}`);
  }
};

const assertHttpsUrl = (value: string, label: string): void => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      throw new Error('non-https URL');
    }
  } catch {
    throw new Error(`Invalid ${label}`);
  }
};

validateSeriesDefinitions();
