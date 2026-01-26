/**
 * File Operations IPC Handlers
 * ==============================
 *
 * Handles file picker and file operations for workflows.
 */

import { ipcMain, dialog } from 'electron';
import { readFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { IPC_CHANNELS } from '../../../shared/constants/ipc';
import { logger } from '../../lib/logger';
import type { Workflow } from '../../../shared/types';

/**
 * Register file operation handlers.
 */
export function registerFileOperationHandlers() {
  /**
   * Open workflow file picker and load workflow.
   */
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_OPEN_FILE_PICKER,
    async () => {
      try {
        logger.info('[FileOperations] Opening workflow file picker');

        const result = await dialog.showOpenDialog({
          title: 'Open Workflow',
          filters: [
            { name: 'Workflow Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ],
          properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) {
          return {
            success: false,
            error: 'No file selected'
          };
        }

        const filePath = result.filePaths[0];
        logger.info('[FileOperations] Loading workflow from:', filePath);

        // Read and parse workflow file
        const content = await readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content);

        // Detect and extract workflow object from different formats
        let workflow: Workflow;
        if (parsed.workflow && typeof parsed.workflow === 'object') {
          // Export format: contains nested workflow property
          workflow = parsed.workflow;
          logger.info('[FileOperations] Detected export format, extracting workflow object');
        } else if (parsed.id && parsed.nodes) {
          // Direct format: already a Workflow object
          workflow = parsed;
          logger.info('[FileOperations] Detected direct workflow format');
        } else {
          throw new Error('Invalid workflow file format: missing required properties');
        }

        // Generate new ID and timestamps to avoid conflicts
        workflow.id = uuidv4();
        workflow.createdAt = new Date().toISOString();
        workflow.updatedAt = new Date().toISOString();

        logger.info('[FileOperations] Workflow loaded successfully with new ID:', workflow.id);
        return {
          success: true,
          data: workflow
        };
      } catch (error) {
        logger.error('[FileOperations] Failed to open workflow:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to open workflow file'
        };
      }
    }
  );

  logger.info('[FileOperations] Handlers registered');
}
