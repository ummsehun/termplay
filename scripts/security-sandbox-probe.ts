import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createGasciiSandboxCommand } from '../src/main/security/processSandbox';

type ProbeResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

const results: ProbeResult[] = [];

const run = (command: string, args: string[], cwd?: string) => {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });
};

const record = (name: string, ok: boolean, detail?: string): void => {
  results.push({ name, ok, detail });
};

const expectExit = (name: string, command: string, args: string[], expectedStatus: number, cwd?: string): void => {
  const result = run(command, args, cwd);
  const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`;
  record(name, result.status === expectedStatus, result.status === expectedStatus ? undefined : detail);
};

const probeMacSandbox = async (): Promise<void> => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'termplay-sandbox-probe-'));
  const installPath = path.join(tempRoot, 'gascii');
  const outsidePath = path.join(tempRoot, 'outside');

  await fs.mkdir(installPath, { recursive: true });
  await fs.mkdir(outsidePath, { recursive: true });

  try {
    if (process.env.TERMPLAY_ENABLE_EXPERIMENTAL_MAC_SANDBOX !== '1') {
      try {
        createGasciiSandboxCommand(installPath, '/usr/bin/true');
        record('macOS production launch fails closed without approved sandbox runtime', false, 'sandbox command was created');
      } catch (error) {
        record(
          'macOS production launch fails closed without approved sandbox runtime',
          error instanceof Error && error.message.includes('not enabled for production use yet'),
          error instanceof Error ? error.message : String(error),
        );
      }
      return;
    }

    const sandbox = createGasciiSandboxCommand(installPath, '/usr/bin/true');
    const profilePath = path.join(installPath, '.termplay-sandbox', 'gascii.sb');

    record('macOS profile file is created', existsSync(profilePath), profilePath);
    expectExit('macOS sandbox can launch a system binary', '/bin/sh', ['-lc', sandbox.commandText], 0);
    expectExit(
      'macOS sandbox allows writes inside install root',
      '/usr/bin/sandbox-exec',
      ['-f', profilePath, '/usr/bin/touch', path.join(installPath, 'allowed-write')],
      0,
    );
    expectExit(
      'macOS sandbox denies writes outside install root',
      '/usr/bin/sandbox-exec',
      ['-f', profilePath, '/usr/bin/touch', path.join(outsidePath, 'blocked-write')],
      1,
    );
    expectExit(
      'macOS sandbox denies reading /etc/passwd data',
      '/usr/bin/sandbox-exec',
      ['-f', profilePath, '/usr/bin/head', '-c', '1', '/etc/passwd'],
      1,
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
};

const probeLinuxSandbox = async (): Promise<void> => {
  const hasBubblewrap = existsSync('/usr/bin/bwrap') || existsSync('/bin/bwrap');
  const hasFirejail = existsSync('/usr/bin/firejail') || existsSync('/bin/firejail');

  record('Linux sandbox runtime is installed', hasBubblewrap || hasFirejail, 'requires bubblewrap or firejail');
};

if (process.platform === 'darwin') {
  await probeMacSandbox();
} else if (process.platform === 'linux') {
  await probeLinuxSandbox();
} else {
  record('platform sandbox support', false, `unsupported platform: ${process.platform}`);
}

const failed = results.filter((result) => !result.ok);

for (const result of results) {
  const mark = result.ok ? 'PASS' : 'FAIL';
  const detail = result.detail ? ` - ${result.detail}` : '';
  console.log(`${mark} ${result.name}${detail}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}
