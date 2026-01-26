/**
 * Code-Server API
 *
 * Renderer process API wrapper for code-server IPC calls.
 */

/**
 * Code-Server API
 *
 * Provides methods to interact with the code-server service
 * running in the main process.
 */
export class CodeServerAPI {
  /**
   * Start code-server for a project
   */
  static async start(projectPath: string, preferredPort?: number) {
    try {
      return await window.electronAPI.start(projectPath, preferredPort);
    } catch (error) {
      console.error('[CodeServerAPI] Failed to start:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Stop code-server for a project
   */
  static async stop(projectPath: string) {
    try {
      return await window.electronAPI.stop(projectPath);
    } catch (error) {
      console.error('[CodeServerAPI] Failed to stop:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get code-server info for a project
   */
  static async getInfo(projectPath: string) {
    try {
      return await window.electronAPI.getInfo(projectPath);
    } catch (error) {
      console.error('[CodeServerAPI] Failed to get info:', error);
      return { running: false };
    }
  }

  /**
   * Stop all code-server instances
   */
  static async stopAll() {
    try {
      return await window.electronAPI.stopAll();
    } catch (error) {
      console.error('[CodeServerAPI] Failed to stop all:', error);
      return { success: false };
    }
  }
}
