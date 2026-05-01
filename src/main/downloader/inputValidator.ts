import path from 'path';

export class InputValidator {
  static validateUrl(url: string): void {
    try {
      const parsed = new URL(url);
      const allowedHosts = [
        'www.youtube.com',
        'youtube.com',
        'youtu.be'
      ];
      if (!allowedHosts.includes(parsed.hostname)) {
        throw new Error('Invalid host');
      }
    } catch {
      throw new Error('Invalid YouTube URL');
    }
  }

  static validateOutputRoot(baseDownloadDir: string, targetDir: string): string {
    const resolved = path.resolve(baseDownloadDir, targetDir);
    if (!resolved.startsWith(baseDownloadDir)) {
      throw new Error('Invalid output directory: path traversal detected');
    }
    return resolved;
  }
}
