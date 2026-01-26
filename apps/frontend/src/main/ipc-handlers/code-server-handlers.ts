/**
 * Code-Server IPC Handlers
 *
 * Exposes code-server service to the renderer process via IPC.
 */

import { ipcMain } from 'electron';
import { getCodeServerService } from '../code-server-service';
import { logger } from '../lib/logger';

/**
 * Register code-server IPC handlers
 */
export function registerCodeServerHandlers(): void {
  const codeServerService = getCodeServerService();

  /**
   * Start code-server for a project
   */
  ipcMain.handle('code-server:start', async (_event, projectPath: string, preferredPort?: number) => {
    return await codeServerService.start(projectPath, preferredPort);
  });

  /**
   * Stop code-server for a project
   */
  ipcMain.handle('code-server:stop', (_event, projectPath: string) => {
    return codeServerService.stop(projectPath);
  });

  /**
   * Get code-server info for a project
   */
  ipcMain.handle('code-server:get-info', (_event, projectPath: string) => {
    return codeServerService.getInfo(projectPath);
  });

  /**
   * Stop all code-server instances
   */
  ipcMain.handle('code-server:stop-all', () => {
    codeServerService.stopAll();
    return { success: true };
  });

  logger.info('[code-server] IPC handlers registered');
}
