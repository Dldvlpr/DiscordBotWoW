export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export class Logger {
    private context: string;
    private static logLevel: LogLevel = LogLevel.INFO;

    constructor(context: string) {
        this.context = context;
    }

    static setLogLevel(level: LogLevel): void {
        Logger.logLevel = level;
    }

    debug(message: string, ...args: any[]): void {
        if (Logger.logLevel <= LogLevel.DEBUG) {
            console.log(`[DEBUG] [${this.context}] ${message}`, ...args);
        }
    }

    info(message: string, ...args: any[]): void {
        if (Logger.logLevel <= LogLevel.INFO) {
            console.log(`[INFO] [${this.context}] ${message}`, ...args);
        }
    }

    warn(message: string, ...args: any[]): void {
        if (Logger.logLevel <= LogLevel.WARN) {
            console.warn(`[WARN] [${this.context}] ${message}`, ...args);
        }
    }

    error(message: string, ...args: any[]): void {
        if (Logger.logLevel <= LogLevel.ERROR) {
            console.error(`[ERROR] [${this.context}] ${message}`, ...args);
        }
    }
}