import { platform } from 'node:os';
import { createLogger } from '@shared/logger';
import { createGasciiSandboxCommand, type SandboxedLaunchCommand } from '../security/processSandbox';
import { type SeriesDefinition } from './series-definitions';

const logger = createLogger('series-launch-security');

const shellQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

export const createSeriesLaunchCommand = (
  definition: SeriesDefinition,
  cwd: string,
  executablePath: string,
): SandboxedLaunchCommand => {
  if (platform() === 'darwin') {
    if (definition.launchSecurity.macos === 'direct') {
      return createDirectCommand(cwd, executablePath, 'direct-macos');
    }

    if (
      definition.launchSecurity.macos === 'sandbox-if-enabled' &&
      process.env.TERMPLAY_ENABLE_EXPERIMENTAL_MAC_SANDBOX !== '1'
    ) {
      logger.warn('macOS sandbox disabled by policy for this series', {
        seriesId: definition.id,
        policy: definition.launchSecurity.macos,
      });
      return createDirectCommand(cwd, executablePath, 'direct-macos-sandbox-disabled');
    }

    return createGasciiSandboxCommand(cwd, executablePath, definition.displayName);
  }

  if (platform() === 'linux') {
    if (definition.launchSecurity.linux === 'direct') {
      return createDirectCommand(cwd, executablePath, 'direct-linux');
    }

    return createGasciiSandboxCommand(cwd, executablePath, definition.displayName);
  }

  throw new Error(`Unsupported launch platform: ${platform()}`);
};

const createDirectCommand = (cwd: string, executablePath: string, label: string): SandboxedLaunchCommand => ({
  commandText: `cd ${shellQuote(cwd)} && ${shellQuote(executablePath)}`,
  label,
});

