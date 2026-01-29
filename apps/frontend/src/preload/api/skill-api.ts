/**
 * Skill API
 *
 * Preload API for browsing and creating Claude Code Skills.
 */

import { ipcRenderer } from 'electron';
import type { SkillScanResult } from '../../shared/types/skill';
import type { IPCResult } from '../../shared/types/common';

export interface CreateSkillPayload {
  name: string;
  description: string;
  instructions: string;
  allowedTools?: string;
  scope: 'user' | 'project' | '';
  projectPath?: string;
}

export interface SkillAPI {
  browseSkills: (projectPath?: string) => Promise<IPCResult<SkillScanResult>>;
  createSkill: (payload: CreateSkillPayload) => Promise<IPCResult<{ skillPath: string }>>;
}

export const createSkillAPI = (): SkillAPI => ({
  browseSkills: (projectPath?: string): Promise<IPCResult<SkillScanResult>> =>
    ipcRenderer.invoke('skill:browse', projectPath),
  createSkill: (payload: CreateSkillPayload): Promise<IPCResult<{ skillPath: string }>> =>
    ipcRenderer.invoke('skill:create', payload),
});
