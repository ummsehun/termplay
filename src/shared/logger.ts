type LogLevel = 'info' | 'warn' | 'error';

const write = (level: LogLevel, scope: string, message: string, meta?: unknown): void => {
  const prefix = `[launcher:${scope}] ${message}`;

  if (meta === undefined) {
    console[level](prefix);
    return;
  }

  console[level](prefix, meta);
};

export const createLogger = (scope: string) => ({
  info: (message: string, meta?: unknown) => write('info', scope, message, meta),
  warn: (message: string, meta?: unknown) => write('warn', scope, message, meta),
  error: (message: string, meta?: unknown) => write('error', scope, message, meta),
});
