import path from 'path';
import { type MediaDownloadFormat } from '@shared/launcherTypes';

const isInsideDirectory = (baseDir: string, targetPath: string): boolean => {
  const relative = path.relative(baseDir, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

export class InputValidator {
  static validateUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }

      const allowedHosts = [
        'www.youtube.com',
        'youtube.com',
        'youtu.be'
      ];
      if (!allowedHosts.includes(parsed.hostname)) {
        throw new Error('Invalid host');
      }

      if (parsed.searchParams.has('list')) {
        throw new Error('Playlists are not supported');
      }
    } catch {
      throw new Error('Invalid YouTube URL');
    }
  }

  static validateFormat(format: string): asserts format is MediaDownloadFormat {
    if (format !== 'mp4' && format !== 'mp3') {
      throw new Error('Invalid media format');
    }
  }

  static validateOutputRoot(baseDownloadDir: string, targetDir: string): string {
    const resolvedBase = path.resolve(baseDownloadDir);
    const resolved = path.resolve(resolvedBase, targetDir);

    if (!isInsideDirectory(resolvedBase, resolved)) {
      throw new Error('Invalid output directory: path traversal detected');
    }

    return resolved;
  }

  static validateOutputDir(baseDownloadDir: string, outputDir: string): string {
    const resolvedBase = path.resolve(baseDownloadDir);
    const resolved = path.resolve(outputDir);

    if (!isInsideDirectory(resolvedBase, resolved)) {
      throw new Error('Invalid output directory: outside allowed download root');
    }

    return resolved;
  }

  static isInsideDirectory(baseDir: string, targetPath: string): boolean {
    return isInsideDirectory(path.resolve(baseDir), path.resolve(targetPath));
  }
}
