/**
 * Export Operations IPC Handlers
 * ================================
 *
 * Handles exporting workflows as slash commands.
 */

import { ipcMain, dialog } from 'electron';
import { writeFile } from 'fs/promises';
import path from 'path';
import { IPC_CHANNELS } from '../../../shared/constants/ipc';
import { logger } from '../../lib/logger';
import type { Workflow } from '../../../shared/types';

interface ExportRequest {
  workflow: Workflow;
  options: {
    context?: 'default' | 'fork';
    model?: 'default' | 'inherit' | 'haiku' | 'sonnet' | 'opus';
    disableModelInvocation?: boolean;
  };
}

/**
 * Register export operation handlers.
 */
export function registerExportHandlers() {
  /**
   * Export workflow as slash command.
   */
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_EXPORT,
    async (event, { workflowId }: { workflowId: string }) => {
      try {
        logger.info('[Export] Exporting workflow:', workflowId);

        // Load workflow from file
        const { readFile } = await import('fs/promises');
        const workflowPath = path.join(process.env.HOME || '', '.auto-claude', 'workflows', `${workflowId}.json`);
        const workflowContent = await readFile(workflowPath, 'utf-8');
        const workflow = JSON.parse(workflowContent) as Workflow;

        // Show save dialog
        const result = await dialog.showSaveDialog({
          title: 'Export Workflow as Slash Command',
          defaultPath: `${workflow.name.toLowerCase().replace(/\s+/g, '-')}.json`,
          filters: [
            { name: 'Workflow Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (result.canceled || !result.filePath) {
          return {
            success: false,
            error: 'Export cancelled'
          };
        }

        const filePath = result.filePath;
        logger.info('[Export] Saving workflow to:', filePath);

        // Prepare export data with slash command options
        const exportData = {
          workflow,
          slashCommandOptions: {
            context: 'default',
            model: 'default',
            disableModelInvocation: false
          },
          exportedAt: new Date().toISOString(),
          version: '1.0.0'
        };

        // Write to file
        await writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

        logger.info('[Export] Workflow exported successfully');
        return {
          success: true,
          data: { filePath }
        };
      } catch (error) {
        logger.error('[Export] Failed to export workflow:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export workflow'
        };
      }
    }
  );

  logger.info('[Export] Handlers registered');
}
