import { z } from 'zod';

export const TerminalSeriesStatusSchema = z.enum([
  'not-installed',
  'installed',
  'update-available',
  'installing',
  'updating',
  'running',
  'error',
]);

export const TerminalSeriesAssetStatusSchema = z.enum([
  'not-installed',
  'installed',
  'missing',
  'outdated',
]);

export const TerminalSeriesAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  required: z.boolean(),
  status: TerminalSeriesAssetStatusSchema,
  sizeLabel: z.string(),
});

export const TerminalSeriesLogSchema = z.object({
  id: z.string(),
  level: z.enum(['info', 'warning', 'error', 'success']),
  message: z.string(),
  timestamp: z.string(),
});

export const TerminalSeriesSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  repositoryUrl: z.string().url(),
  status: TerminalSeriesStatusSchema,
  installedVersion: z.string().nullable(),
  latestVersion: z.string(),
  installPath: z.string().nullable(),
  runtimeRequirements: z.array(z.string()),
  assets: z.array(TerminalSeriesAssetSchema),
  logs: z.array(TerminalSeriesLogSchema),
});
