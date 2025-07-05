import { Config } from '../config/Config';

export class Logger {
  constructor(private readonly config: Config) {}

  public info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }

  public error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  public debug(message: string, ...args: any[]): void {
    if (this.config.getBoolean('DEBUG', false)) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
} 