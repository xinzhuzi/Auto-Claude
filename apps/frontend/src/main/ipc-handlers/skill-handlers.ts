/**
 * Skill IPC Handlers
 *
 * Handles IPC requests for browsing and creating Claude Code Skills.
 */

import { ipcMain } from 'electron';
import { scanAllSkills, createSkill, type CreateSkillPayload } from '../services/skill-service';

/**
 * Register skill-related IPC handlers
 */
export function registerSkillHandlers(): void {
  // Browse skills (scan user and project directories)
  ipcMain.handle('skill:browse', async (_event, projectPath?: string) => {
    try {
      const result = await scanAllSkills(projectPath);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Skill IPC] Failed to browse skills:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Create a new skill
  ipcMain.handle('skill:create', async (_event, payload: CreateSkillPayload) => {
    try {
      const skillPath = await createSkill(payload);
      return { success: true, data: { skillPath } };
    } catch (error) {
      console.error('[Skill IPC] Failed to create skill:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  console.log('[IPC] Skill handlers registered');
}
