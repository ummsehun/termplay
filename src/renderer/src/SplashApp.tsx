import React, { useEffect, useState } from 'react';
import type { SeriesLaunchProgress } from '@shared/launcherTypes';

const INITIAL_PROGRESS: SeriesLaunchProgress = {
  seriesId: 'gascii',
  stage: 'resolving',
  stepLabel: 'Resolving app',
  progress: 0,
  message: 'Preparing TermPlay',
};

export const SplashApp: React.FC = () => {
  const [progress, setProgress] = useState<SeriesLaunchProgress>(INITIAL_PROGRESS);
  const [isDark, setIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const isFailed = progress.stage === 'failed';
  const isCompleted = progress.stage === 'completed';

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onThemeChange = () => setIsDark(media.matches);
    media.addEventListener('change', onThemeChange);
    const unsubscribe = window.launcher.series.onLaunchProgress((event) => {
      if (event.seriesId === 'gascii') {
        setProgress(event);
      }
    });

    return () => {
      media.removeEventListener('change', onThemeChange);
      unsubscribe();
    };
  }, []);

  return (
    <main className={['h-screen w-screen', isDark ? 'bg-[#050505] text-white' : 'bg-white text-neutral-950'].join(' ')}>
      <div className="flex h-full flex-col items-center justify-center px-16">
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="text-center">
            <div className={['text-[44px] font-black tracking-[0.32em]', isDark ? 'text-white' : 'text-neutral-950'].join(' ')}>
              TERMPLAY
            </div>
            <div className={['mt-4 text-[13px] font-semibold uppercase tracking-[0.45em]', isDark ? 'text-white/45' : 'text-neutral-500'].join(' ')}>
              Gascii
            </div>
          </div>
        </div>

        <div className="mb-16 w-full max-w-[520px]">
          <div className="mb-4 flex items-center justify-between text-[12px] font-semibold uppercase tracking-[0.22em]">
            <span className={isFailed ? 'text-red-500' : isDark ? 'text-white/55' : 'text-neutral-500'}>
              {progress.stepLabel}
            </span>
            <span className={isDark ? 'text-white/35' : 'text-neutral-400'}>{progress.progress}%</span>
          </div>
          <div className={['h-2 overflow-hidden rounded-full', isDark ? 'bg-white/15' : 'bg-neutral-200'].join(' ')}>
            <div
              className={[
                'h-full rounded-full transition-all duration-500',
                isFailed ? 'bg-red-500' : isCompleted ? 'bg-emerald-500' : isDark ? 'bg-white' : 'bg-neutral-950',
              ].join(' ')}
              style={{ width: `${Math.min(100, Math.max(0, progress.progress))}%` }}
            />
          </div>
          <p className={['mt-4 min-h-5 text-center text-[13px]', isFailed ? 'text-red-500' : isDark ? 'text-white/50' : 'text-neutral-500'].join(' ')}>
            {progress.error ?? progress.message}
          </p>
        </div>
      </div>
    </main>
  );
};
