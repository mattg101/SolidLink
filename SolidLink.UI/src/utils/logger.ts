/**
 * Debug logging utility for SolidLink UI.
 * Provides structured, toggleable logging for development and debugging.
 */

// Debug mode can be toggled via localStorage or build config
const isDebugEnabled = (): boolean => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('solidlink_debug') === 'true';
    }
    return process.env.NODE_ENV === 'development';
};

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    level: LogLevel;
    component: string;
    message: string;
    data?: unknown;
    timestamp: Date;
}

const logHistory: LogEntry[] = [];
const MAX_LOG_HISTORY = 500;

/**
 * Log a message with optional data. Only outputs in debug mode.
 */
export const log = (component: string, message: string, data?: unknown): void => {
    const entry: LogEntry = {
        level: 'info',
        component,
        message,
        data,
        timestamp: new Date(),
    };

    logHistory.push(entry);
    if (logHistory.length > MAX_LOG_HISTORY) logHistory.shift();

    if (isDebugEnabled()) {
        const prefix = `[${component}]`;
        if (data !== undefined) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
    }
};

/**
 * Log a warning.
 */
export const logWarn = (component: string, message: string, data?: unknown): void => {
    const entry: LogEntry = { level: 'warn', component, message, data, timestamp: new Date() };
    logHistory.push(entry);
    if (logHistory.length > MAX_LOG_HISTORY) logHistory.shift();

    console.warn(`[${component}]`, message, data ?? '');
};

/**
 * Log an error.
 */
export const logError = (component: string, message: string, error?: unknown): void => {
    const entry: LogEntry = { level: 'error', component, message, data: error, timestamp: new Date() };
    logHistory.push(entry);
    if (logHistory.length > MAX_LOG_HISTORY) logHistory.shift();

    console.error(`[${component}]`, message, error ?? '');
};

/**
 * Get log history for debugging.
 */
export const getLogHistory = (): LogEntry[] => [...logHistory];

/**
 * Clear log history.
 */
export const clearLogHistory = (): void => {
    logHistory.length = 0;
};

/**
 * Enable or disable debug logging.
 */
export const setDebugEnabled = (enabled: boolean): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('solidlink_debug', String(enabled));
    }
};

// Expose to window for debugging in browser console
if (typeof window !== 'undefined') {
    (window as any).SolidLinkDebug = {
        enable: () => setDebugEnabled(true),
        disable: () => setDebugEnabled(false),
        getHistory: getLogHistory,
        clearHistory: clearLogHistory,
    };
}
