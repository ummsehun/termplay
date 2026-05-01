export interface NormalizedDownloadInput {
  url: string;
  format: 'mp4' | 'mp3';
  outputDir: string;
  ffmpegPath: string;
}

export class ArgumentBuilder {
  static build(input: NormalizedDownloadInput): string[] {
    const args = [
      '--newline',
      '--progress',
      '--no-playlist',
      '--restrict-filenames',
      '--paths',
      input.outputDir,
      '-o',
      '%(title).200s.%(ext)s',
    ];

    if (input.format === 'mp4') {
      args.push(
        '--format',
        'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format',
        'mp4'
      );
    } else if (input.format === 'mp3') {
      args.push(
        '--extract-audio',
        '--audio-format',
        'mp3',
        '--ffmpeg-location',
        input.ffmpegPath
      );
    }

    args.push(input.url);
    return args;
  }
}
