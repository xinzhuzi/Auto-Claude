/**
 * Skill Types for Claude Code Skills
 */

export interface SkillReference {
  name: string;
  description: string;
  skillPath: string;
  scope: 'user' | 'project' | 'local';
  validationStatus: 'valid' | 'missing' | 'invalid';
  allowedTools?: string;
  source?: 'claude' | 'copilot' | 'codex';
}

export interface SkillScanResult {
  user: SkillReference[];
  project: SkillReference[];
  local: SkillReference[];
}

export interface SkillMetadata {
  name: string;
  description: string;
  allowedTools?: string;
}
