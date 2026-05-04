import { platform } from 'node:os';
import { type SelectedRelease } from './gascii-release-resolver';

const MIENJINE_OWNER = 'ummsehun';
const MIENJINE_REPO = 'mienjine';
const MIENJINE_TAG = 'v0.1.5';
const GITHUB_REPO_URL = `https://github.com/${MIENJINE_OWNER}/${MIENJINE_REPO}`;

const ASSETS = {
  darwinArm64: {
    name: 'terminal-miku3d-macos-arm64.tar.gz',
    size: 3_040_000,
    digest: 'sha256:96a373be7f07023f15226687a867038a7a9912285194c8662e917143dd13dfe4',
  },
  linuxX64: {
    name: 'terminal-miku3d-linux-x64.tar.gz',
    size: 3_870_000,
    digest: 'sha256:e861e9e9a877ea8b67176296c3ef6ac3e373ac91269dfc67450abe8448f3377f',
  },
} as const;

export class MienjineReleaseResolver {
  async resolveRelease(): Promise<SelectedRelease> {
    const asset = this.getAsset();

    return {
      tag: MIENJINE_TAG,
      asset: {
        ...asset,
        browser_download_url: `${GITHUB_REPO_URL}/releases/download/${MIENJINE_TAG}/${asset.name}`,
      },
    };
  }

  getAsset(): { name: string; size: number; digest: string } {
    if (platform() === 'darwin' && process.arch === 'arm64') {
      return ASSETS.darwinArm64;
    }

    if (platform() === 'linux' && process.arch === 'x64') {
      return ASSETS.linuxX64;
    }

    throw new Error(`Unsupported platform: ${platform()} ${process.arch}`);
  }

  assertSupportedPlatform(): void {
    if (platform() === 'win32') {
      throw new Error('Windows support is not ready yet');
    }

    this.getAsset();
  }
}

export const mienjineReleaseResolver = new MienjineReleaseResolver();
