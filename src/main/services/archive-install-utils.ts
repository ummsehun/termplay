import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { isAbsolute, join, posix } from 'node:path';

export const verifySha256Digest = (expectedDigest: string, actualHexDigest: string): void => {
  const expected = /^sha256:([a-f0-9]{64})$/i.exec(expectedDigest);
  if (!expected) {
    throw new Error('Release asset digest is not a supported SHA-256 digest');
  }

  if (expected[1].toLowerCase() !== actualHexDigest.toLowerCase()) {
    throw new Error('Release asset digest verification failed');
  }
};

export const assertSafeTarArchiveEntries = (archivePath: string): void => {
  const result = spawnSync('tar', ['-tzf', archivePath], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`;
    throw new Error(`Archive listing failed: ${detail}`);
  }

  const entries = result.stdout.split(/\r?\n/).filter(Boolean);
  if (entries.length === 0) {
    throw new Error('Archive is empty');
  }

  for (const entry of entries) {
    const normalized = posix.normalize(entry);
    if (
      entry.includes('\0') ||
      normalized === '.' ||
      normalized.startsWith('../') ||
      normalized.includes('/../') ||
      normalized.startsWith('/') ||
      isAbsolute(entry) ||
      /^[A-Za-z]:/.test(entry)
    ) {
      throw new Error(`Archive contains unsafe entry: ${entry}`);
    }
  }
};

export const assertNoSymlinks = async (rootPath: string): Promise<void> => {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const entryPath = join(rootPath, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Archive contains unsupported symbolic link: ${entry.name}`);
    }

    if (entry.isDirectory()) {
      await assertNoSymlinks(entryPath);
    }
  }));
};

