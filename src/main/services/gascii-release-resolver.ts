import { platform } from 'node:os';
import { parseReleaseVersion, parseTagFromReleaseUrl } from './gascii-version';

const GAScii_OWNER = 'ummsehun';
const GAScii_REPO = 'Gascii';
const GITHUB_REPO_URL = `https://github.com/${GAScii_OWNER}/${GAScii_REPO}`;
const LATEST_RELEASE_API_URL = `https://api.github.com/repos/${GAScii_OWNER}/${GAScii_REPO}/releases/latest`;

export type GithubReleaseAsset = {
  name: string;
  browser_download_url: string;
  size?: number;
  digest: string;
};

export type SelectedRelease = {
  tag: string;
  asset: GithubReleaseAsset;
};

export class GasciiReleaseResolver {
  async resolveLatestRelease(): Promise<SelectedRelease> {
    const release = await this.fetchLatestRelease();
    const version = parseReleaseVersion(release.tag_name);
    const platformAssetSuffix = this.getAssetSuffix();

    if (!version) {
      throw new Error(`Unsupported Gascii release tag: ${release.tag_name}`);
    }

    const assetName = `gascii-${version.tag}-${platformAssetSuffix}`;
    const asset = release.assets.find((candidate) => candidate.name === assetName);
    if (!asset) {
      throw new Error(`Gascii release asset not found: ${assetName}`);
    }

    if (!/^sha256:[a-f0-9]{64}$/i.test(asset.digest)) {
      throw new Error(`Gascii release asset is missing a SHA-256 digest: ${assetName}`);
    }

    return {
      tag: version.tag,
      asset,
    };
  }

  getAssetSuffix(): string {
    if (platform() === 'darwin' && process.arch === 'arm64') {
      return 'darwin-arm64.tar.gz';
    }

    if (platform() === 'linux' && process.arch === 'x64') {
      return 'linux-x64.tar.gz';
    }

    throw new Error(`Unsupported platform: ${platform()} ${process.arch}`);
  }

  assertSupportedPlatform(): void {
    if (platform() === 'win32') {
      throw new Error('Windows support is not ready yet');
    }

    this.getAssetSuffix();
  }

  private async fetchLatestRelease(): Promise<{ tag_name: string; assets: GithubReleaseAsset[] }> {
    const response = await fetch(LATEST_RELEASE_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'TermPlay',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub latest release lookup failed: HTTP ${response.status}`);
    }

    const data = await response.json() as {
      tag_name?: unknown;
      assets?: Array<{
        name?: unknown;
        browser_download_url?: unknown;
        size?: unknown;
        digest?: unknown;
      }>;
    };

    if (typeof data.tag_name !== 'string' || !parseTagFromReleaseUrl(`${GITHUB_REPO_URL}/releases/tag/${data.tag_name}`)) {
      throw new Error('GitHub latest release response did not include a valid tag');
    }

    if (!Array.isArray(data.assets)) {
      throw new Error('GitHub latest release response did not include assets');
    }

    return {
      tag_name: data.tag_name,
      assets: data.assets
        .filter((asset): asset is GithubReleaseAsset =>
          typeof asset.name === 'string' &&
          typeof asset.browser_download_url === 'string' &&
          typeof asset.digest === 'string' &&
          (typeof asset.size === 'number' || typeof asset.size === 'undefined'),
        ),
    };
  }
}

export const gasciiReleaseResolver = new GasciiReleaseResolver();
