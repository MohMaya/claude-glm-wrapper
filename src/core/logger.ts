export type LogLevel = "debug" | "info" | "warn" | "error";

let isDebugMode = false;
let isJsonMode = false;

export function setDebugMode(enabled: boolean) {
  isDebugMode = enabled;
}

export function setJsonMode(enabled: boolean) {
  isJsonMode = enabled;
}

function formatLog(level: LogLevel, message: string, data?: Record<string, unknown>) {
  if (isJsonMode) {
    console.log(JSON.stringify({ level, message, ...data, timestamp: new Date().toISOString() }));
    return;
  }

  const timestamp = new Date().toISOString().substring(11, 19);
  const prefix = `[${timestamp}] ${level.toUpperCase().padEnd(5)}`;
  
  if (data) {
    console.log(`${prefix} ${message}`, JSON.stringify(data!));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export function createLogger() {
  return {
    setDebugMode,
    setJsonMode,
    debug: (message: string, data?: Record<string, unknown>) => {
      if (isDebugMode) {
        formatLog("debug", message, data);
      }
    },
    info: (message: string, data?: Record<string, unknown>) => {
      formatLog("info", message, data);
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      formatLog("warn", message, data);
    },
    error: (message: string, data?: Record<string, unknown>) => {
      formatLog("error", message, data);
    }
  };
}
