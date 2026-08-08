const isDev =
  typeof import.meta !== "undefined" &&
  import.meta.env != null &&
  Boolean(import.meta.env.DEV);

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
