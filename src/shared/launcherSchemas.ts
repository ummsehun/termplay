import { z } from 'zod';

export const terminalSeriesIdSchema = z.enum(['gascii', 'mienjine']);
export const libraryDirKeySchema = z.enum(['video', 'audio', 'backup', 'camera', 'glb', 'music', 'pmx', 'stage', 'sync', 'vmd']);
export const launcherSettingKeySchema = z.enum(['hwAccel', 'autoClean', 'highRes', 'physics']);
export const mediaDownloadFormatSchema = z.enum(['mp4', 'mp3']);

export const allowedLibraryDirsBySeries = {
  gascii: ['video', 'audio'],
  mienjine: ['backup', 'camera', 'glb', 'music', 'pmx', 'stage', 'sync', 'vmd'],
} as const satisfies Record<z.infer<typeof terminalSeriesIdSchema>, Array<z.infer<typeof libraryDirKeySchema>>>;

export const isAllowedLibraryDir = (
  seriesId: z.infer<typeof terminalSeriesIdSchema>,
  dir: z.infer<typeof libraryDirKeySchema>,
): boolean => (allowedLibraryDirsBySeries[seriesId] as readonly string[]).includes(dir);

export const seriesRequestSchema = z.object({
  seriesId: terminalSeriesIdSchema,
});

export const setInstallPathRequestSchema = z.object({
  seriesId: terminalSeriesIdSchema,
  path: z.string().min(1).max(4096),
});

export const setSeriesOptionRequestSchema = z.object({
  seriesId: terminalSeriesIdSchema,
  key: launcherSettingKeySchema,
  value: z.boolean(),
});

export const setGlobalOptionRequestSchema = z.discriminatedUnion('key', [
  z.object({
    key: z.literal('language'),
    value: z.enum(['ko', 'en', 'ja']),
  }),
  z.object({
    key: z.literal('autoUpdate'),
    value: z.boolean(),
  }),
]);

export const libraryDirRequestSchema = z.object({
  seriesId: terminalSeriesIdSchema,
  dir: libraryDirKeySchema,
}).refine((request) => isAllowedLibraryDir(request.seriesId, request.dir), {
  message: 'Directory is not available for this series',
});

export const assetRequestSchema = z.object({
  seriesId: terminalSeriesIdSchema,
});

export const downloadAssetRequestSchema = z.object({
  seriesId: terminalSeriesIdSchema,
  assetId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
});

export const cancelDownloadRequestSchema = z.object({
  downloadId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
});

export const startMediaDownloadRequestSchema = z.object({
  seriesId: terminalSeriesIdSchema,
  url: z.string().min(1).max(2048),
  format: mediaDownloadFormatSchema,
  outputDir: z.string().min(1).max(4096).optional(),
});

export const cancelMediaDownloadRequestSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);

export const openExternalRequestSchema = z.object({
  url: z.string().min(1).max(2048),
});
