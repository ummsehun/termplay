import { type SeriesLaunchProgress, type TerminalSeriesId } from '@shared/launcherTypes';

export type LaunchProgressListener = (event: SeriesLaunchProgress) => void;

export type LaunchStepDefinition = {
  stage: SeriesLaunchProgress['stage'];
  label: string;
  progress: number;
};

export const DEFAULT_LAUNCH_STEPS: LaunchStepDefinition[] = [
  { stage: 'resolving', label: 'Resolving app', progress: 8 },
  { stage: 'checking-installation', label: 'Checking installation', progress: 22 },
  { stage: 'checking-version', label: 'Checking version', progress: 36 },
  { stage: 'verifying-binary', label: 'Verifying binary', progress: 50 },
  { stage: 'preparing-permissions', label: 'Preparing permissions', progress: 64 },
  { stage: 'preparing-terminal', label: 'Preparing terminal', progress: 80 },
  { stage: 'launching', label: 'Launching', progress: 94 },
];

export class SeriesLaunchProgressEmitter {
  constructor(
    private readonly seriesId: TerminalSeriesId,
    private readonly onProgress: LaunchProgressListener,
    private readonly steps: LaunchStepDefinition[] = DEFAULT_LAUNCH_STEPS,
  ) {}

  emit(stepIndex: number, message: string): void {
    const step = this.steps[stepIndex];
    if (!step) {
      throw new Error(`Launch step is not configured: ${stepIndex}`);
    }

    this.onProgress({
      seriesId: this.seriesId,
      stage: step.stage,
      stepLabel: step.label,
      progress: step.progress,
      message,
    });
  }

  complete(message = 'Opening external terminal'): void {
    this.onProgress({
      seriesId: this.seriesId,
      stage: 'completed',
      stepLabel: 'Launching',
      progress: 100,
      message,
    });
  }

  async pauseStep(): Promise<void> {
    await wait(260);
  }

  async pauseComplete(): Promise<void> {
    await wait(700);
  }
}

const wait = async (durationMs: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

