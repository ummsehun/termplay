import { type SelectedRelease } from './gascii-release-resolver';
import { buildGithubReleaseAssetUrl, getRuntimePlatformKey, SERIES_DEFINITIONS } from './series-definitions';

const MIENJINE_DEFINITION = SERIES_DEFINITIONS.mienjine;

export class MienjineReleaseResolver {
  async resolveRelease(): Promise<SelectedRelease> {
    const asset = this.getAsset();
    const release = MIENJINE_DEFINITION.release;
    if (!release) {
      throw new Error('Mienjine release definition is missing');
    }

    return {
      tag: release.tag,
      asset: {
        ...asset,
        browser_download_url: buildGithubReleaseAssetUrl(release, asset.name),
      },
    };
  }

  getAsset(): { name: string; size: number; digest: string } {
    const release = MIENJINE_DEFINITION.release;
    if (!release) {
      throw new Error('Mienjine release definition is missing');
    }

    const platformKey = getRuntimePlatformKey();
    const asset = release.assets[platformKey];
    if (!asset) {
      throw new Error(`Mienjine release asset is not configured for platform: ${platformKey}`);
    }

    return asset;
  }

  assertSupportedPlatform(): void {
    this.getAsset();
  }
}

export const mienjineReleaseResolver = new MienjineReleaseResolver();
