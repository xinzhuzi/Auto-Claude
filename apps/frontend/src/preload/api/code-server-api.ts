/**
 * Code-Server API
 *
 * Exposes code-server IPC handlers to the renderer process.
 */

import { ipcRenderer } from 'electron';

export interface CodeServerAPI {
  /**
   * Start code-server for a project
   */
  start: (projectPath: string, preferredPort?: number) => Promise<{
    success: boolean;
    port?: number;
    url?: string;
    error?: string;
  }>;

  /**
   * Stop code-server for a project
   */
  stop: (projectPath: string) => Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Get code-server info for a project
   */
  getInfo: (projectPath: string) => Promise<{
    running: boolean;
    port?: number;
    url?: string;
  }>;

  /**
   * Stop all code-server instances
   */
  stopAll: () => Promise<{
    success: boolean;
  }>;
}

export const createCodeServerAPI = (): CodeServerAPI => ({
  start: (projectPath: string, preferredPort?: number) =>
    ipcRenderer.invoke('code-server:start', projectPath, preferredPort),

  stop: (projectPath: string) =>
    ipcRenderer.invoke('code-server:stop', projectPath),

  getInfo: (projectPath: string) =>
    ipcRenderer.invoke('code-server:get-info', projectPath),

  stopAll: () =>
    ipcRenderer.invoke('code-server:stop-all')
});
