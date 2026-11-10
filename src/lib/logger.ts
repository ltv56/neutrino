const isDev = import.meta.env.DEV;

// debug is dropped in prod so reading data doesn't leak into the console
export const log = {
  debug: (...args: unknown[]): void => {
    if (isDev) console.debug(...args);
  },
  warn: (...args: unknown[]): void => console.warn(...args),
  error: (...args: unknown[]): void => console.error(...args),
};
