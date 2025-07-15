// Video logging utilities with timestamps

type LogLevel = 'log' | 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
    emoji?: string;
    data?: any;
}

function getTimestamp(): string {
    const now = new Date();
    const time = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    return `${time}.${ms}`;
}

function formatMessage(prefix: string, message: string, options?: LogOptions): string {
    const timestamp = getTimestamp();
    const emoji = options?.emoji ? `${options.emoji} ` : '';
    return `[${timestamp}] [${prefix}] ${emoji}${message}`;
}

export function createVideoLogger(prefix: string) {
    const log = (level: LogLevel, message: string, options?: LogOptions) => {
        const formattedMessage = formatMessage(prefix, message, options);
        
        if (options?.data) {
            console[level](formattedMessage, options.data);
        } else {
            console[level](formattedMessage);
        }
    };

    return {
        log: (message: string, options?: LogOptions) => log('log', message, options),
        debug: (message: string, options?: LogOptions) => log('debug', message, options),
        info: (message: string, options?: LogOptions) => log('info', message, options),
        warn: (message: string, options?: LogOptions) => log('warn', message, options),
        error: (message: string, options?: LogOptions) => log('error', message, options),
    };
}

// Pre-configured loggers for different parts of the video system
export const hostVideoLogger = createVideoLogger('HostVideo');
export const presentationVideoLogger = createVideoLogger('Presentation');
export const videoSyncLogger = createVideoLogger('VideoSync');
export const hostLogger = createVideoLogger('Host');