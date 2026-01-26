/**
 * Logger IPC Handlers
 *
 * Handles log messages from renderer process
 */

import { ipcMain } from 'electron';
import { logger } from '../lib/logger';

const IPC_CHANNEL = 'log-to-file';

export function registerLoggerHandlers(): void {
  ipcMain.on(IPC_CHANNEL, (_event, logData) => {
    const { level, context, message, data } = logData;

    // Create a scoped logger for the renderer context
    const rendererLogger = logger.child(context);

    switch (level) {
      case 'DEBUG':
        rendererLogger.debug(message, data);
        break;
      case 'INFO':
        rendererLogger.info(message, data);
        break;
      case 'WARN':
        rendererLogger.warn(message, data);
        break;
      case 'ERROR':
        rendererLogger.error(message, data);
        break;
      default:
        rendererLogger.info(message, data);
    }
  });
}
