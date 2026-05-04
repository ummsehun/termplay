import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';

export type SandboxedLaunchCommand = {
  commandText: string;
  label: string;
};

const shellQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

const firstExistingPath = (paths: string[]): string | null => paths.find((candidate) => existsSync(candidate)) ?? null;
const commandExists = (commandPath: string): boolean => existsSync(commandPath);

const writeMacSandboxProfile = (cwd: string, appName: string): string => {
  const sandboxDir = join(cwd, '.termplay-sandbox');
  const profilePath = join(sandboxDir, `${appName.toLowerCase()}.sb`);

  mkdirSync(sandboxDir, { recursive: true, mode: 0o700 });
  writeFileSync(profilePath, [
    '(version 1)',
    '(deny default)',
    '(allow process*)',
    '(allow signal (target self))',
    '(allow sysctl-read)',
    '(allow mach-lookup)',
    '(allow file-read-metadata)',
    '(allow file-read-data',
    '  (subpath "/System")',
    '  (subpath "/usr/lib")',
    '  (subpath "/usr/share")',
    '  (subpath "/private/var/db")',
    `  (subpath ${JSON.stringify(cwd)}))`,
    '(allow file-read* (subpath "/dev"))',
    '(allow file-write*',
    `  (subpath ${JSON.stringify(cwd)})`,
    '  (subpath "/private/tmp"))',
    '',
  ].join('\n'), { mode: 0o600 });

  return profilePath;
};

const createMacSandboxCommand = (cwd: string, binaryPath: string, appName: string): SandboxedLaunchCommand => {
  if (!commandExists('/usr/bin/sandbox-exec')) {
    throw new Error(`macOS sandbox-exec is required to launch ${appName} in a sandbox`);
  }

  if (process.env.TERMPLAY_ENABLE_EXPERIMENTAL_MAC_SANDBOX !== '1') {
    throw new Error('macOS process sandbox is not enabled for production use yet');
  }

  const profilePath = writeMacSandboxProfile(cwd, appName);
  return {
    commandText: `cd ${shellQuote(cwd)} && /usr/bin/sandbox-exec -f ${shellQuote(profilePath)} ${shellQuote(binaryPath)}`,
    label: 'sandbox-exec',
  };
};

const existingLinuxBindArgs = (mode: 'ro-bind' | 'bind', paths: string[]): string[] => {
  return paths.flatMap((candidate) => existsSync(candidate) ? [`--${mode}`, candidate, candidate] : []);
};

const createBubblewrapCommand = (bwrapPath: string, cwd: string, binaryPath: string): SandboxedLaunchCommand => {
  const args = [
    '--die-with-parent',
    '--unshare-all',
    '--proc', '/proc',
    '--dev', '/dev',
    '--tmpfs', '/tmp',
    ...existingLinuxBindArgs('ro-bind', ['/bin', '/usr', '/lib', '/lib64', '/etc']),
    ...existingLinuxBindArgs('bind', [cwd]),
    '--chdir', cwd,
    binaryPath,
  ];

  return {
    commandText: [bwrapPath, ...args].map(shellQuote).join(' '),
    label: 'bubblewrap',
  };
};

const createFirejailCommand = (firejailPath: string, cwd: string, binaryPath: string): SandboxedLaunchCommand => {
  const args = [
    '--quiet',
    '--noprofile',
    '--net=none',
    `--private=${cwd}`,
    `--whitelist=${cwd}`,
    '--',
    binaryPath,
  ];

  return {
    commandText: [firejailPath, ...args].map(shellQuote).join(' '),
    label: 'firejail',
  };
};

const createLinuxSandboxCommand = (cwd: string, binaryPath: string, appName: string): SandboxedLaunchCommand => {
  const bwrapPath = firstExistingPath(['/usr/bin/bwrap', '/bin/bwrap']);
  if (bwrapPath) {
    return createBubblewrapCommand(bwrapPath, cwd, binaryPath);
  }

  const firejailPath = firstExistingPath(['/usr/bin/firejail', '/bin/firejail']);
  if (firejailPath) {
    return createFirejailCommand(firejailPath, cwd, binaryPath);
  }

  throw new Error(`bubblewrap or firejail is required to launch ${appName} in a Linux sandbox`);
};

export const createGasciiSandboxCommand = (cwd: string, binaryPath: string, appName = 'Gascii'): SandboxedLaunchCommand => {
  if (process.env.TERMPLAY_DISABLE_PROCESS_SANDBOX === '1') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Process sandbox cannot be disabled in production');
    }

    return {
      commandText: `cd ${shellQuote(cwd)} && ${shellQuote(binaryPath)}`,
      label: 'sandbox-disabled-dev',
    };
  }

  if (platform() === 'darwin') {
    return createMacSandboxCommand(cwd, binaryPath, appName);
  }

  if (platform() === 'linux') {
    return createLinuxSandboxCommand(cwd, binaryPath, appName);
  }

  throw new Error(`Unsupported sandbox platform: ${platform()}`);
};
