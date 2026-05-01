import { platform } from 'node:os';
import { parseReleaseVersion, parseTagFromReleaseUrl } from './gascii-version';

const GAScii_OWNER = 'ummsehun';
const GAScii_REPO = 'Gascii';
const GITHUB_REPO_URL = `https://github.com/${GAScii_OWNER}/${GAScii_REPO}`;
const LATEST_RELEASE_URL = `${GITHUB_REPO_URL}/releases/latest`;

export type GithubReleaseAsset = {
  name: string;
  browser_download_url: string;
  size?: number;
};

export type SelectedRelease = {
  tag: string;
  asset: GithubReleaseAsset;
};

export class GasciiReleaseResolver {
  async resolveLatestRelease(): Promise<SelectedRelease> {
    const latestTag = await this.resolveLatestReleaseTag();
    const version = parseReleaseVersion(latestTag);
    const platformAssetSuffix = this.getAssetSuffix();

    if (!version) {
      throw new Error(`Unsupported Gascii release tag: ${latestTag}`);
    }

    const assetName = `gascii-${version.tag}-${platformAssetSuffix}`;

    return {
      tag: version.tag,
      asset: {
        name: assetName,
        browser_download_url: `${GITHUB_REPO_URL}/releases/download/${version.tag}/${assetName}`,
      },
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

  private async resolveLatestReleaseTag(): Promise<string> {
    const response = await fetch(LATEST_RELEASE_URL, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'TermPlay',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub latest release lookup failed: HTTP ${response.status}`);
    }

    const tag = parseTagFromReleaseUrl(response.url);
    if (tag) {
      return tag;
    }

    const fallbackResponse = await fetch(LATEST_RELEASE_URL, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'TermPlay',
      },
    });

    if (!fallbackResponse.ok) {
      throw new Error(`GitHub latest release lookup failed: HTTP ${fallbackResponse.status}`);
    }

    const fallbackTag = parseTagFromReleaseUrl(fallbackResponse.url);
    if (!fallbackTag) {
      throw new Error('Could not resolve latest Gascii release tag');
    }

    return fallbackTag;
  }
}

export const gasciiReleaseResolver = new GasciiReleaseResolver();
