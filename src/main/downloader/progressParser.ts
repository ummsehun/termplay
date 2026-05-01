export interface DownloadProgressEvent {
  jobId: string;
  percent?: number;
  downloadedText?: string;
  totalText?: string;
  speedText?: string;
  etaText?: string;
  phase: 'downloading' | 'extracting' | 'merging' | 'completed' | 'unknown';
}

export class ProgressParser {
  // Example pattern: [download]  45.0% of   50.00MiB at    2.00MiB/s ETA 00:12
  // Or: [download] 100% of 50.00MiB
  private static downloadRegex = /\[download\]\s+([\d.]+)%\s+of\s+([~\d.\w]+)(?:\s+at\s+([\d.\w/]+))?(?:\s+ETA\s+([\d:]+))?/;

  static parseLine(line: string, jobId: string): DownloadProgressEvent | null {
    if (!line) return null;

    const trimmed = line.trim();

    if (trimmed.startsWith('[download]')) {
      if (trimmed.includes('Destination:') || trimmed.includes('has already been downloaded')) {
        return { jobId, phase: 'downloading', percent: 0 };
      }

      if (trimmed.includes('100%')) {
        // Don't mark complete yet, it might still need extracting/merging
        return { jobId, phase: 'downloading', percent: 100 };
      }

      const match = this.downloadRegex.exec(trimmed);
      if (match) {
        return {
          jobId,
          phase: 'downloading',
          percent: parseFloat(match[1]),
          totalText: match[2],
          speedText: match[3],
          etaText: match[4]
        };
      }
    }

    if (trimmed.startsWith('[ExtractAudio]') || trimmed.startsWith('[ffmpeg]')) {
      return { jobId, phase: 'extracting', percent: 100 };
    }

    if (trimmed.startsWith('[Merger]')) {
      return { jobId, phase: 'merging', percent: 100 };
    }

    return null;
  }
}
