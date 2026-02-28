/**
 * App Update IPC Handlers
 *
 * Handles IPC communication for Electron app auto-updates.
 * Provides manual controls for checking, downloading, and installing updates.
 *
 * DISABLED: 自动更新功能已禁用（本地构建版本无需更新）
 */

import { app, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResult, AppUpdateInfo } from '../../shared/types';

// Auto-update is disabled for local/self-built versions
const AUTO_UPDATE_DISABLED = true;

/**
 * Register all app-update-related IPC handlers
 * All handlers return "disabled" status when AUTO_UPDATE_DISABLED is true
 */
export function registerAppUpdateHandlers(): void {
  console.warn('[IPC] Registering app update handlers (DISABLED)');

  // ============================================
  // App Update Operations - ALL DISABLED
  // ============================================

  /**
   * APP_UPDATE_CHECK: Manually check for updates
   * DISABLED - Returns null (no update available)
   */
  ipcMain.handle(
    IPC_CHANNELS.APP_UPDATE_CHECK,
    async (): Promise<IPCResult<AppUpdateInfo | null>> => {
      if (AUTO_UPDATE_DISABLED) {
        console.warn('[app-update-handlers] Update check disabled');
        return { success: true, data: null }; // No update available
      }
      return { success: true, data: null };
    }
  );

  /**
   * APP_UPDATE_DOWNLOAD: Manually download update
   * DISABLED - Returns error
   */
  ipcMain.handle(
    IPC_CHANNELS.APP_UPDATE_DOWNLOAD,
    async (): Promise<IPCResult> => {
      if (AUTO_UPDATE_DISABLED) {
        return { success: false, error: 'Auto-update is disabled' };
      }
      return { success: false, error: 'Auto-update is disabled' };
    }
  );

  /**
   * APP_UPDATE_DOWNLOAD_STABLE: Download stable version (for downgrade from beta)
   * DISABLED - Returns error
   */
  ipcMain.handle(
    IPC_CHANNELS.APP_UPDATE_DOWNLOAD_STABLE,
    async (): Promise<IPCResult> => {
      if (AUTO_UPDATE_DISABLED) {
        return { success: false, error: 'Auto-update is disabled' };
      }
      return { success: false, error: 'Auto-update is disabled' };
    }
  );

  /**
   * APP_UPDATE_INSTALL: Quit and install update
   * DISABLED - Returns error
   */
  ipcMain.handle(
    IPC_CHANNELS.APP_UPDATE_INSTALL,
    async (): Promise<IPCResult> => {
      if (AUTO_UPDATE_DISABLED) {
        return { success: false, error: 'Auto-update is disabled' };
      }
      return { success: false, error: 'Auto-update is disabled' };
    }
  );

  /**
   * APP_UPDATE_GET_VERSION: Get current app version
   * Returns the current application version (still works)
   */
  ipcMain.handle(
    IPC_CHANNELS.APP_UPDATE_GET_VERSION,
    async (): Promise<string> => {
      return app.getVersion();
    }
  );

  /**
   * APP_UPDATE_GET_DOWNLOADED: Get downloaded update info
   * DISABLED - Returns null (no downloaded update)
   */
  ipcMain.handle(
    IPC_CHANNELS.APP_UPDATE_GET_DOWNLOADED,
    async (): Promise<IPCResult<AppUpdateInfo | null>> => {
      if (AUTO_UPDATE_DISABLED) {
        return { success: true, data: null }; // No downloaded update
      }
      return { success: true, data: null };
    }
  );

  console.warn('[IPC] App update handlers registered (DISABLED)');
}
