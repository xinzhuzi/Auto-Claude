/**
 * Skill Service
 *
 * Scans and validates Claude Code Skills from local directories.
 * Migrated from cc-wf-studio/src/extension/services/skill-service.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { SkillReference, SkillScanResult, SkillMetadata } from '../../shared/types/skill';

/**
 * Parse YAML frontmatter from SKILL.md content
 */
export function parseSkillFrontmatter(content: string): SkillMetadata | null {
  // Check for YAML frontmatter (starts with ---)
  if (!content.startsWith('---')) {
    return null;
  }

  // Find the closing ---
  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) {
    return null;
  }

  const frontmatter = content.substring(3, endIndex).trim();

  // Simple YAML parsing for name, description, and allowed-tools
  const lines = frontmatter.split('\n');
  let name = '';
  let description = '';
  let allowedTools = '';

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim().toLowerCase();
    let value = line.substring(colonIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    switch (key) {
      case 'name':
        name = value;
        break;
      case 'description':
        description = value;
        break;
      case 'allowed-tools':
      case 'allowedtools':
        allowedTools = value;
        break;
    }
  }

  if (!name || !description) {
    return null;
  }

  return {
    name,
    description,
    allowedTools: allowedTools || undefined,
  };
}

/**
 * Get user skills directory (~/.claude/skills/)
 */
export function getUserSkillsDir(): string {
  return path.join(os.homedir(), '.claude', 'skills');
}

/**
 * Get project skills directory ({projectPath}/.claude/skills/)
 */
export function getProjectSkillsDir(projectPath: string): string {
  return path.join(projectPath, '.claude', 'skills');
}

/**
 * Scan a Skills directory and return available Skills
 */
export async function scanSkills(
  baseDir: string,
  scope: 'user' | 'project' | 'local',
  source?: 'claude' | 'copilot' | 'codex'
): Promise<SkillReference[]> {
  const skills: SkillReference[] = [];

  try {
    const subdirs = await fs.readdir(baseDir, { withFileTypes: true });

    for (const dirent of subdirs) {
      if (!dirent.isDirectory()) {
        continue;
      }

      const skillPath = path.join(baseDir, dirent.name, 'SKILL.md');

      try {
        const content = await fs.readFile(skillPath, 'utf-8');
        const metadata = parseSkillFrontmatter(content);

        if (metadata) {
          skills.push({
            skillPath,
            name: metadata.name,
            description: metadata.description,
            scope,
            validationStatus: 'valid',
            allowedTools: metadata.allowedTools,
            source,
          });
        } else {
          // Invalid frontmatter - still add but mark as invalid
          console.warn(`[Skill Service] Invalid YAML frontmatter in ${skillPath}`);
          skills.push({
            skillPath,
            name: dirent.name,
            description: 'Invalid SKILL.md frontmatter',
            scope,
            validationStatus: 'invalid',
            source,
          });
        }
      } catch (err) {
        // File not found or read error - skip this Skill
        console.warn(`[Skill Service] Failed to read ${skillPath}:`, err);
      }
    }
  } catch (_err) {
    // Directory doesn't exist - return empty array
    console.warn(`[Skill Service] Skill directory not found: ${baseDir}`);
  }

  return skills;
}

/**
 * Scan all Skills (user + project)
 */
export async function scanAllSkills(projectPath?: string): Promise<SkillScanResult> {
  const userDir = getUserSkillsDir();

  const [userSkills, projectSkills] = await Promise.all([
    scanSkills(userDir, 'user', 'claude'),
    projectPath
      ? scanSkills(getProjectSkillsDir(projectPath), 'project', 'claude')
      : Promise.resolve([]),
  ]);

  return {
    user: userSkills,
    project: projectSkills,
    local: [], // Plugin skills not implemented yet
  };
}

/**
 * Create Skill payload interface
 */
export interface CreateSkillPayload {
  name: string;
  description: string;
  instructions: string;
  allowedTools?: string;
  scope: 'user' | 'project' | '';
  projectPath?: string;
}

/**
 * Generate SKILL.md file content
 */
export function generateSkillFileContent(payload: CreateSkillPayload): string {
  const frontmatter: string[] = [
    '---',
    `name: ${payload.name}`,
    `description: ${payload.description}`,
  ];

  // Add allowed-tools if provided
  if (payload.allowedTools && payload.allowedTools.trim().length > 0) {
    frontmatter.push(`allowed-tools: ${payload.allowedTools.trim()}`);
  }

  frontmatter.push('---');

  // Combine frontmatter and instructions
  const content = [...frontmatter, '', payload.instructions].join('\n');

  return content;
}

/**
 * Create a new Skill
 */
export async function createSkill(payload: CreateSkillPayload): Promise<string> {
  // Determine target directory based on scope
  let baseDir: string;

  if (payload.scope === 'user') {
    baseDir = getUserSkillsDir();
  } else if (payload.scope === 'project') {
    if (!payload.projectPath) {
      throw new Error('Project path is required for project-scoped skills');
    }
    baseDir = getProjectSkillsDir(payload.projectPath);
  } else {
    throw new Error('Invalid scope: must be "user" or "project"');
  }

  // Create skill directory
  const skillDir = path.join(baseDir, payload.name);

  // Check if skill already exists
  try {
    await fs.access(skillDir);
    throw new Error(`Skill "${payload.name}" already exists at ${skillDir}`);
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    // Directory doesn't exist, which is what we want
  }

  // Create directory structure
  await fs.mkdir(skillDir, { recursive: true });

  // Generate and write SKILL.md
  const skillPath = path.join(skillDir, 'SKILL.md');
  const content = generateSkillFileContent(payload);
  await fs.writeFile(skillPath, content, 'utf-8');

  console.log(`[Skill Service] Created skill at ${skillPath}`);

  return skillPath;
}
