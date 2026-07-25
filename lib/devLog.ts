const isDev = import.meta.env?.DEV ?? false;

export const devLog = {
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
};
