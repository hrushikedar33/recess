const shouldLog = true;

export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog) {
      console.log(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (shouldLog) {
      console.info(...args);
    }
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
