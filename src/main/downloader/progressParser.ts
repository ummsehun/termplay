import { type MediaDownloadProgress } from '@shared/launcherTypes';

export class ProgressParser {
  // Example pattern: [download]  45.0% of   50.00MiB at    2.00MiB/s ETA 00:12
  // Or: [download] 100% of 50.00MiB
  private static downloadRegex = /\[download\]\s+([\d.]+)%\s+of\s+~?\s*([^\s]+)(?:\s+at\s+([^\s]+))?(?:\s+ETA\s+([^\s]+))?/i;

  static parseLine(line: string, jobId: string): MediaDownloadProgress | null {
    if (!line) return null;

    const trimmed = line.trim();

    if (trimmed.startsWith('[download]')) {
      if (trimmed.includes('Destination:') || trimmed.includes('has already been downloaded')) {
        return { jobId, status: 'running', percent: 0, message: trimmed };
      }

      if (trimmed.includes('100%')) {
        // Don't mark complete yet, it might still need extracting/merging
        return { jobId, status: 'running', percent: 100, message: trimmed };
      }

      const match = this.downloadRegex.exec(trimmed);
      if (match) {
        return {
          jobId,
          status: 'running',
          percent: parseFloat(match[1]),
          totalText: match[2],
          speedText: match[3],
          etaText: match[4],
          message: trimmed,
        };
      }
    }

    if (trimmed.startsWith('[ExtractAudio]') || trimmed.startsWith('[ffmpeg]')) {
      return { jobId, status: 'postprocessing', percent: 100, message: trimmed.startsWith('[ExtractAudio]') ? 'Extracting audio' : trimmed };
    }

    if (trimmed.startsWith('[Merger]')) {
      return { jobId, status: 'postprocessing', percent: 100, message: 'Merging media' };
    }

    return null;
  }
}
