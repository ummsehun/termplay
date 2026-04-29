import { TerminalSeries } from '../types/terminalSeriesTypes';
import { mockTerminalSeries } from '../data/mockTerminalSeries';

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const terminalSeriesApi = {
  async getSeriesList(): Promise<TerminalSeries[]> {
    await delay(500);
    return [...mockTerminalSeries];
  },

  async installSeries(seriesId: string): Promise<void> {
    // In reality, this would invoke IPC to download and extract
    await delay(3000); // simulate install time
  },

  async launchSeries(seriesId: string): Promise<void> {
    // In reality, this would invoke IPC to spawn child_process
    await delay(2000); // simulate running time
  },

  async updateSeries(seriesId: string): Promise<void> {
    await delay(2500);
  },

  async removeSeries(seriesId: string): Promise<void> {
    await delay(1000);
  },
};
