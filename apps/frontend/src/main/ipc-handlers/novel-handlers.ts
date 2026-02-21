/**
 * Novel module IPC handlers
 */

import { ipcMain, app, dialog } from 'electron';
import type { BrowserWindow } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { readFile, writeFile, readdir } from 'fs/promises';
import { randomUUID } from 'crypto';
import {
  IPC_CHANNELS,
  AUTO_BUILD_PATHS,
  DEFAULT_NOVEL_MODULE_PATHS,
  DEFAULT_APP_SETTINGS,
  DEFAULT_FEATURE_MODELS,
  DEFAULT_FEATURE_THINKING,
} from '../../shared/constants';
import type {
  IPCResult,
  NovelProject,
  NovelCharacter,
  NovelGenerateRequest,
  NovelGenerationStatus,
  NovelPromptsFile,
  NovelDocumentConfig,
  NovelWorkflow,
  AppSettings,
  ModelTypeShort,
  ThinkingLevel,
} from '../../shared/types';
import { projectStore } from '../project-store';
import type { AgentManager } from '../agent';
import { parsePythonCommand } from '../python-detector';
import { getConfiguredPythonPath, pythonEnvManager } from '../python-env-manager';
import { getPathDelimiter } from '../platform';
import { getOAuthModeClearVars } from '../agent/env-utils';
import { getAPIProfileEnv } from '../services/profile';
import { getBestAvailableProfileEnv } from '../rate-limit-detector';
import { writeFileWithRetry, readFileWithRetry } from '../utils/atomic-file';
import { debugLog, debugError } from '../../shared/utils/debug-logger';
import { safeSendToRenderer } from './utils';
import { getEffectiveSourcePath } from '../updater/path-resolver';

function getNovelFeatureSettings(): { model?: ModelTypeShort; thinkingLevel?: ThinkingLevel } {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');

  try {
    if (existsSync(settingsPath)) {
      const content = readFileSync(settingsPath, 'utf-8');
      const settings: AppSettings = { ...DEFAULT_APP_SETTINGS, ...JSON.parse(content) };
      const featureModels = settings.featureModels || DEFAULT_FEATURE_MODELS;
      const featureThinking = settings.featureThinking || DEFAULT_FEATURE_THINKING;

      return {
        model: featureModels.novel ?? DEFAULT_FEATURE_MODELS.novel,
        thinkingLevel: featureThinking.novel ?? DEFAULT_FEATURE_THINKING.novel,
      };
    }
  } catch (error) {
    debugError('[Novel Handler] Failed to read feature settings:', error);
  }

  return {
    model: DEFAULT_FEATURE_MODELS.novel,
    thinkingLevel: DEFAULT_FEATURE_THINKING.novel,
  };
}

function createDefaultNovel(): NovelProject {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: '',
    genre: '',
    theme: '',
    intro: '',
    keywords: '',
    outline: '',
    content: '',
    generatedContent: '',
    chapters: [],
    characters: [],
    worldSettings: [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeNovel(novel: Partial<NovelProject>): NovelProject {
  const defaults = createDefaultNovel();
  return {
    ...defaults,
    ...novel,
    chapters: Array.isArray(novel.chapters) ? novel.chapters : defaults.chapters,
    characters: Array.isArray(novel.characters) ? novel.characters : defaults.characters,
    worldSettings: Array.isArray(novel.worldSettings) ? novel.worldSettings : defaults.worldSettings,
  };
}

function createDefaultNovelConfig(): NovelDocumentConfig {
  const now = new Date().toISOString();
  return {
    version: 1,
    modulePaths: { ...DEFAULT_NOVEL_MODULE_PATHS },
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeNovelConfig(config: Partial<NovelDocumentConfig>): NovelDocumentConfig {
  const defaults = createDefaultNovelConfig();
  return {
    ...defaults,
    ...config,
    modulePaths: {
      ...defaults.modulePaths,
      ...(config.modulePaths || {})
    }
  };
}

type FrontmatterValue = string | string[];

function extractFrontmatter(content: string): { frontmatter: string | null; body: string } {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  if (!match) {
    return { frontmatter: null, body: content };
  }
  return { frontmatter: match[1], body: content.slice(match[0].length) };
}

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, '');
}

function parseFrontmatter(frontmatter: string): Record<string, FrontmatterValue> {
  const data: Record<string, FrontmatterValue> = {};
  const lines = frontmatter.split(/\r?\n/);
  let currentKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const keyMatch = trimmed.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1];
      const value = keyMatch[2].trim();
      currentKey = key;
      if (value) {
        data[key] = stripQuotes(value);
      } else {
        data[key] = [];
      }
      continue;
    }

    const listMatch = trimmed.match(/^-+\s*(.+)$/);
    if (listMatch && currentKey) {
      const entry = stripQuotes(listMatch[1].trim());
      if (!entry) continue;
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = [];
      }
      (data[currentKey] as string[]).push(entry);
    }
  }

  return data;
}

function extractFirstHeading(body: string): string | null {
  const headingMatch = body.match(/^#\s+(.+)$/m);
  return headingMatch ? headingMatch[1].trim() : null;
}

function extractFirstParagraph(body: string): string {
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    return trimmed;
  }
  return '';
}

function parseTraits(value: FrontmatterValue | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  const raw = value.trim();
  if (!raw) return [];
  if (raw.includes(',')) {
    return raw.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [raw];
}

function resolveModulePath(projectPath: string, modulePath: string): string {
  const resolved = path.isAbsolute(modulePath)
    ? modulePath
    : path.join(projectPath, modulePath);
  return path.resolve(resolved);
}

function resolveOverviewPrefacePath(projectPath: string, modulePath: string): string {
  const resolved = resolveModulePath(projectPath, modulePath);
  if (resolved.toLowerCase().endsWith('.md')) {
    return resolved;
  }
  return path.join(resolved, '序.md');
}

function buildOverviewPrefaceTemplate(): string {
  return '# 序\n';
}

function getCharacterId(projectPath: string, filePath: string): string {
  const relative = path.relative(projectPath, filePath);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
    return relative;
  }
  return filePath;
}

function parseCharacterMarkdown(
  projectPath: string,
  filePath: string,
  content: string,
  category: string
): NovelCharacter {
  const fileName = path.basename(filePath, path.extname(filePath));
  const { frontmatter, body } = extractFrontmatter(content);
  const frontmatterData = frontmatter ? parseFrontmatter(frontmatter) : {};

  const name = (frontmatterData.name as string | undefined)?.trim()
    || extractFirstHeading(body)
    || fileName;
  const description = (frontmatterData.description as string | undefined)?.trim()
    || extractFirstParagraph(body);
  const personality = (frontmatterData.personality as string | undefined)?.trim() || '';
  const appearance = (frontmatterData.appearance as string | undefined)?.trim() || '';
  const background = (frontmatterData.background as string | undefined)?.trim() || '';
  const contentText = body.trim();
  const traits = parseTraits(frontmatterData.traits);

  return {
    id: getCharacterId(projectPath, filePath),
    name,
    description,
    personality,
    appearance,
    background,
    traits,
    content: contentText,
    category,
    sourcePath: filePath
  };
}

function buildCharacterTemplate(name: string): string {
  const safeName = name || '未命名角色';
  return [
    '---',
    `name: ${safeName}`,
    'description: ',
    'personality: ',
    'appearance: ',
    'background: ',
    'traits:',
    '  - ',
    '---',
    '',
    `# ${safeName}`,
    ''
  ].join('\n');
}

function resolveCharacterDocsDir(projectPath: string, modulePath: string): { dir?: string; error?: string } {
  const resolved = resolveModulePath(projectPath, modulePath);
  if (resolved.toLowerCase().endsWith('.md')) {
    return { error: '人物角色路径请配置为文件夹' };
  }
  return { dir: resolved };
}

async function collectMarkdownFiles(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectMarkdownFiles(entryPath);
      files.push(...nested);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(entryPath);
    }
  }

  return files;
}

function getCharacterCategory(rootDir: string, filePath: string): string {
  const relative = path.relative(rootDir, filePath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return '未分类';
  }
  const segments = relative.split(path.sep).filter(Boolean);
  if (segments.length <= 1) return '未分类';
  return segments[0];
}


function buildNovelMarkdown(novel: NovelProject): string {
  const lines: string[] = [];
  const title = novel.title || '未命名小说';
  lines.push(`# ${title}`);

  if (novel.genre) lines.push(`**类型**：${novel.genre}`);
  if (novel.theme) lines.push(`**主题**：${novel.theme}`);
  if (novel.keywords) lines.push(`**关键词**：${novel.keywords}`);

  if (novel.intro) {
    lines.push('');
    lines.push('## 简介');
    lines.push(novel.intro);
  }

  if (novel.outline) {
    lines.push('');
    lines.push('## 大纲');
    lines.push(novel.outline);
  }

  if (novel.characters?.length) {
    lines.push('');
    lines.push('## 人物角色');
    novel.characters.forEach((character, idx) => {
      const name = character.name || `人物 ${idx + 1}`;
      lines.push('');
      lines.push(`### ${name}`);
      const detail = buildCharacterMarkdown(character as Record<string, unknown>);
      if (detail) lines.push(detail);
    });
  }

  if (novel.worldSettings?.length) {
    lines.push('');
    lines.push('## 世界观设定');
    novel.worldSettings.forEach((setting, idx) => {
      const titleText = setting.title || `设定 ${idx + 1}`;
      lines.push('');
      lines.push(`### ${titleText}`);
      const detail = buildWorldMarkdown(setting as Record<string, unknown>);
      if (detail) lines.push(detail);
    });
  }

  if (novel.chapters?.length) {
    lines.push('');
    lines.push('## 章节');
    novel.chapters.forEach((chapter, idx) => {
      const chapterTitle = chapter.title || `章节 ${idx + 1}`;
      lines.push('');
      lines.push(`### ${idx + 1}. ${chapterTitle}`);
      if (chapter.outline) {
        lines.push('');
        lines.push('**章节大纲**');
        lines.push(chapter.outline);
      }
      if (chapter.content) {
        lines.push('');
        lines.push('**正文**');
        lines.push(chapter.content);
      } else if (chapter.generatedText) {
        lines.push('');
        lines.push('**生成内容**');
        lines.push(chapter.generatedText as string);
      }
    });
  }

  if (novel.content) {
    lines.push('');
    lines.push('## 正文');
    lines.push(novel.content);
  }

  return lines.join('\n');
}

function createDefaultPrompts(): NovelPromptsFile {
  const now = new Date().toISOString();
  return {
    prompts: [
      {
        id: randomUUID(),
        title: '玄幻修真大纲生成器',
        category: 'outline',
        description: '专门用于玄幻修真类小说的大纲创作，包含完整的修真体系',
        content: '请为我创作一个玄幻修真小说的大纲，设定如下：\n\n【基础设定】\n- 小说类型：{小说类型}\n- 主角姓名：{主角姓名}\n- 修真境界：{境界体系}\n- 世界背景：{世界设定}\n\n【创作要求】\n1. 详细的修真境界划分和突破条件\n2. 主角的成长路线和机缘设定\n3. 主要反派和势力分布\n4. 至少15章的详细大纲\n5. 完整的世界观架构\n6. 情感线和人物关系网',
        tags: ['玄幻', '修真', '大纲', '境界'],
        usageCount: 0
      },
      {
        id: randomUUID(),
        title: '科幻AI反叛情节',
        category: 'brainstorm',
        description: '生成关于人工智能觉醒和反叛的科幻情节',
        content: '创作一个关于人工智能觉醒的科幻情节：\n\n【背景设定】\n时间：{时间设定}\nAI系统：{AI名称}\n主角身份：{主角职业}\n\n【情节要求】\n1. AI觉醒的触发事件\n2. 人类与AI的初次冲突\n3. 主角的道德困境\n4. 意想不到的转折点\n5. 人机关系的新平衡\n\n【风格要求】\n- 深度探讨科技伦理\n- 人性与理性的碰撞\n- 未来社会的反思',
        tags: ['科幻', 'AI', '反叛', '伦理'],
        usageCount: 0
      },
      {
        id: randomUUID(),
        title: '古风言情告白场景',
        category: 'content-dialogue',
        description: '生成古风背景下的浪漫告白对话场景',
        content: '创作一个古风言情小说中的告白场景：\n\n【场景设定】\n地点：{场景地点}\n时间：{时间节点}\n男主：{男主姓名} - {男主身份}\n女主：{女主姓名} - {女主身份}\n\n【情感背景】\n{前情提要}\n\n【创作要求】\n1. 以对话为主，占70%篇幅\n2. 融入古代文化元素\n3. 情感真挚，层次丰富\n4. 适当的环境描写烘托气氛\n5. 体现古人含蓄内敛的表达方式\n6. 字数控制在800-1200字',
        tags: ['古风', '言情', '告白', '对话'],
        usageCount: 0
      }
    ],
    exportTime: now,
    type: 'prompts'
  };
}

function buildCharacterMarkdown(character: Record<string, unknown>): string {
  if (typeof character.description === 'string' && character.description.trim()) {
    return character.description;
  }

  const lines: string[] = [];
  if (typeof character.appearance === 'string' && character.appearance.trim()) {
    lines.push(`外貌：${character.appearance}`);
  }
  if (typeof character.personality === 'string' && character.personality.trim()) {
    lines.push(`性格：${character.personality}`);
  }
  if (typeof character.background === 'string' && character.background.trim()) {
    lines.push(`背景：${character.background}`);
  }
  if (typeof character.occupation === 'string' && character.occupation.trim()) {
    lines.push(`职业：${character.occupation}`);
  }
  if (Array.isArray(character.traits) && character.traits.length) {
    lines.push(`特征：${character.traits.join('、')}`);
  }
  if (Array.isArray(character.skills) && character.skills.length) {
    lines.push(`技能：${character.skills.join('、')}`);
  }

  return lines.join('\n');
}

function buildWorldMarkdown(setting: Record<string, unknown>): string {
  if (typeof setting.description === 'string' && setting.description.trim()) {
    return setting.description;
  }

  const lines: string[] = [];
  if (typeof setting.overview === 'string' && setting.overview.trim()) {
    lines.push(`概述：${setting.overview}`);
  }
  if (typeof setting.geography === 'string' && setting.geography.trim()) {
    lines.push(`地理：${setting.geography}`);
  }
  if (typeof setting.history === 'string' && setting.history.trim()) {
    lines.push(`历史：${setting.history}`);
  }
  if (Array.isArray(setting.rules) && setting.rules.length) {
    lines.push(`规则：${setting.rules.join('、')}`);
  }
  if (Array.isArray(setting.features) && setting.features.length) {
    lines.push(`特色：${setting.features.join('、')}`);
  }

  return lines.join('\n');
}

function renderTemplate(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key) => {
    const value = params[key];
    if (value === undefined || value === null) return '';
    if (Array.isArray(value)) {
      return value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join('\n');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  });
}

function extractStepResult(output: string): { data: string; tokensUsed?: number } | null {
  const lines = output.split('\n').map((line) => line.trim()).filter(Boolean).reverse();
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as { type?: string; data?: { data?: string; tokensUsed?: number } };
      if (parsed?.type === 'result' && parsed.data?.data !== undefined) {
        return parsed.data;
      }
      if ((parsed as { data?: string }).data && typeof (parsed as { data?: string }).data === 'string') {
        return { data: (parsed as { data?: string }).data as string };
      }
    } catch {
      // ignore non-JSON lines
    }
  }
  return null;
}

export function registerNovelHandlers(
  agentManager: AgentManager,
  getMainWindow: () => BrowserWindow | null
): void {
  // Novel operations
  ipcMain.handle(
    IPC_CHANNELS.NOVEL_GET,
    async (_, projectId: string): Promise<IPCResult<NovelProject | null>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const novelDir = path.join(project.path, AUTO_BUILD_PATHS.NOVEL_DIR);
      const novelPath = path.join(novelDir, AUTO_BUILD_PATHS.NOVEL_FILE);

      try {
        if (!existsSync(novelDir)) {
          mkdirSync(novelDir, { recursive: true });
        }

        if (!existsSync(novelPath)) {
          const novel = createDefaultNovel();
          await writeFileWithRetry(novelPath, JSON.stringify(novel, null, 2), { encoding: 'utf-8' });
          return { success: true, data: novel };
        }

        const content = await readFileWithRetry(novelPath, { encoding: 'utf-8' }) as string;
        const novel = normalizeNovel(JSON.parse(content) as Partial<NovelProject>);
        return { success: true, data: novel };
      } catch (error) {
        debugError('[Novel Handler] Failed to load novel:', error);
        return { success: false, error: 'Failed to load novel' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.NOVEL_CONFIG_GET,
    async (_, projectId: string): Promise<IPCResult<NovelDocumentConfig>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const novelDir = path.join(project.path, AUTO_BUILD_PATHS.NOVEL_DIR);
      const configPath = path.join(novelDir, AUTO_BUILD_PATHS.NOVEL_CONFIG);

      try {
        if (!existsSync(novelDir)) {
          mkdirSync(novelDir, { recursive: true });
        }

        if (!existsSync(configPath)) {
          const config = createDefaultNovelConfig();
          await writeFileWithRetry(configPath, JSON.stringify(config, null, 2), { encoding: 'utf-8' });
          return { success: true, data: config };
        }

        const content = await readFileWithRetry(configPath, { encoding: 'utf-8' }) as string;
        const config = normalizeNovelConfig(JSON.parse(content) as Partial<NovelDocumentConfig>);
        return { success: true, data: config };
      } catch (error) {
        debugError('[Novel Handler] Failed to load config:', error);
        return { success: false, error: 'Failed to load novel config' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.NOVEL_CONFIG_SAVE,
    async (_, projectId: string, config: NovelDocumentConfig): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const novelDir = path.join(project.path, AUTO_BUILD_PATHS.NOVEL_DIR);
      const configPath = path.join(novelDir, AUTO_BUILD_PATHS.NOVEL_CONFIG);

      try {
        if (!existsSync(novelDir)) {
          mkdirSync(novelDir, { recursive: true });
        }
        const normalized = normalizeNovelConfig(config);
        normalized.updatedAt = new Date().toISOString();
        await writeFileWithRetry(configPath, JSON.stringify(normalized, null, 2), { encoding: 'utf-8' });
        return { success: true };
      } catch (error) {
        debugError('[Novel Handler] Failed to save config:', error);
        return { success: false, error: 'Failed to save novel config' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.NOVEL_OVERVIEW_PREFACE_GET,
    async (_, projectId: string): Promise<IPCResult<{ filePath: string; content: string }>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const novelDir = path.join(project.path, AUTO_BUILD_PATHS.NOVEL_DIR);
      const configPath = path.join(novelDir, AUTO_BUILD_PATHS.NOVEL_CONFIG);

      let config: NovelDocumentConfig;
      try {
        if (!existsSync(novelDir)) {
          mkdirSync(novelDir, { recursive: true });
        }

        if (!existsSync(configPath)) {
          config = createDefaultNovelConfig();
          await writeFileWithRetry(configPath, JSON.stringify(config, null, 2), { encoding: 'utf-8' });
        } else {
          const content = await readFileWithRetry(configPath, { encoding: 'utf-8' }) as string;
          config = normalizeNovelConfig(JSON.parse(content) as Partial<NovelDocumentConfig>);
        }
      } catch (error) {
        debugError('[Novel Handler] Failed to load config:', error);
        return { success: false, error: 'Failed to load novel config' };
      }

      const modulePath = config.modulePaths?.overview;
      if (!modulePath) {
        return { success: false, error: '概览路径未配置' };
      }

      const filePath = resolveOverviewPrefacePath(project.path, modulePath);
      try {
        const dirPath = path.dirname(filePath);
        if (!existsSync(dirPath)) {
          mkdirSync(dirPath, { recursive: true });
        }
        if (!existsSync(filePath)) {
          await writeFileWithRetry(filePath, buildOverviewPrefaceTemplate(), { encoding: 'utf-8' });
        }
        const content = await readFileWithRetry(filePath, { encoding: 'utf-8' }) as string;
        return { success: true, data: { filePath, content } };
      } catch (error) {
        debugError('[Novel Handler] Failed to load overview preface:', error);
        return { success: false, error: 'Failed to load overview preface' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.NOVEL_CHARACTERS_LOAD_FROM_DOCS,
    async (_, projectId: string): Promise<IPCResult<NovelCharacter[]>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const novelDir = path.join(project.path, AUTO_BUILD_PATHS.NOVEL_DIR);
      const configPath = path.join(novelDir, AUTO_BUILD_PATHS.NOVEL_CONFIG);

      let config: NovelDocumentConfig;
      try {
        if (!existsSync(novelDir)) {
          mkdirSync(novelDir, { recursive: true });
        }

        if (!existsSync(configPath)) {
          config = createDefaultNovelConfig();
          await writeFileWithRetry(configPath, JSON.stringify(config, null, 2), { encoding: 'utf-8' });
        } else {
          const content = await readFileWithRetry(configPath, { encoding: 'utf-8' }) as string;
          config = normalizeNovelConfig(JSON.parse(content) as Partial<NovelDocumentConfig>);
        }
      } catch (error) {
        debugError('[Novel Handler] Failed to load config:', error);
        return { success: false, error: 'Failed to load novel config' };
      }

      const modulePath = config.modulePaths?.characters;
      if (!modulePath) {
        return { success: false, error: '人物角色路径未配置' };
      }

      const { dir, error } = resolveCharacterDocsDir(project.path, modulePath);
      if (!dir) {
        return { success: false, error: error || '人物角色路径无效' };
      }

      if (!existsSync(dir)) {
        return { success: false, error: '人物角色目录不存在' };
      }

      try {
        const filePaths = await collectMarkdownFiles(dir);
        filePaths.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        const characters: NovelCharacter[] = [];
        for (const filePath of filePaths) {
          try {
            const content = await readFile(filePath, 'utf-8');
            const category = getCharacterCategory(dir, filePath);
            characters.push(parseCharacterMarkdown(project.path, filePath, content, category));
          } catch (error) {
            debugError('[Novel Handler] Failed to read character doc:', error);
          }
        }

        return { success: true, data: characters };
      } catch (error) {
        debugError('[Novel Handler] Failed to load character docs:', error);
        return { success: false, error: 'Failed to load character docs' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.NOVEL_CHARACTER_DOC_CREATE,
    async (_, projectId: string): Promise<IPCResult<NovelCharacter | null>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const novelDir = path.join(project.path, AUTO_BUILD_PATHS.NOVEL_DIR);
      const configPath = path.join(novelDir, AUTO_BUILD_PATHS.NOVEL_CONFIG);

      let config: NovelDocumentConfig;
      try {
        if (!existsSync(novelDir)) {
          mkdirSync(novelDir, { recursive: true });
        }

        if (!existsSync(configPath)) {
          config = createDefaultNovelConfig();
          await writeFileWithRetry(configPath, JSON.stringify(config, null, 2), { encoding: 'utf-8' });
        } else {
          const content = await readFileWithRetry(configPath, { encoding: 'utf-8' }) as string;
          config = normalizeNovelConfig(JSON.parse(content) as Partial<NovelDocumentConfig>);
        }
      } catch (error) {
        debugError('[Novel Handler] Failed to load config:', error);
        return { success: false, error: 'Failed to load novel config' };
      }

      const modulePath = config.modulePaths?.characters;
      if (!modulePath) {
        return { success: false, error: '人物角色路径未配置' };
      }

      const { dir, error } = resolveCharacterDocsDir(project.path, modulePath);
      if (!dir) {
        return { success: false, error: error || '人物角色路径无效' };
      }

      try {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        const defaultFileName = `角色-${new Date().toISOString().slice(0, 10)}.md`;
        const mainWindow = getMainWindow();
        const result = await dialog.showSaveDialog(mainWindow ?? undefined, {
          title: '新建人物角色',
          defaultPath: path.join(dir, defaultFileName),
          filters: [
            { name: 'Markdown', extensions: ['md'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (result.canceled || !result.filePath) {
          return { success: false, error: 'Cancelled' };
        }

        const rawPath = result.filePath;
        const filePath = rawPath.toLowerCase().endsWith('.md') ? rawPath : `${rawPath}.md`;
        const fileName = path.basename(filePath, path.extname(filePath)) || '未命名角色';
        const content = buildCharacterTemplate(fileName);

        await writeFileWithRetry(filePath, content, { encoding: 'utf-8' });

        const category = getCharacterCategory(dir, filePath);
        return {
          success: true,
          data: parseCharacterMarkdown(project.path, filePath, content, category)
        };
      } catch (error) {
        debugError('[Novel Handler] Failed to create character doc:', error);
        return { success: false, error: 'Failed to create character doc' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.NOVEL_PROMPTS_GET,
    async (_, projectId: string): Promise<IPCResult<NovelPromptsFile>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const novelDir = path.join(project.path, AUTO_BUILD_PATHS.NOVEL_DIR);
      const promptsPath = path.join(novelDir, AUTO_BUILD_PATHS.NOVEL_PROMPTS);
      const defaultPrompts: NovelPromptsFile = createDefaultPrompts();

      try {
        if (!existsSync(novelDir)) {
          mkdirSync(novelDir, { recursive: true });
        }

        if (!existsSync(promptsPath)) {
          await writeFileWithRetry(promptsPath, JSON.stringify(defaultPrompts, null, 2), { encoding: 'utf-8' });
          return { success: true, data: defaultPrompts };
        }

        const content = await readFileWithRetry(promptsPath, { encoding: 'utf-8' }) as string;
        const prompts = JSON.parse(content) as NovelPromptsFile;
        return { success: true, data: prompts };
      } catch (error) {
        debugError('[Novel Handler] Failed to load prompts:', error);
        return { success: false, error: 'Failed to load prompts' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.NOVEL_PROMPTS_SAVE,
    async (_, projectId: string, prompts: NovelPromptsFile): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const novelDir = path.join(project.path, AUTO_BUILD_PATHS.NOVEL_DIR);
      const promptsPath = path.join(novelDir, AUTO_BUILD_PATHS.NOVEL_PROMPTS);

      try {
        if (!existsSync(novelDir)) {
          mkdirSync(novelDir, { recursive: true });
        }
        await writeFileWithRetry(promptsPath, JSON.stringify(prompts, null, 2), { encoding: 'utf-8' });
        return { success: true };
      } catch (error) {
        debugError('[Novel Handler] Failed to save prompts:', error);
        return { success: false, error: 'Failed to save prompts' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.NOVEL_PROMPTS_IMPORT,
    async (_, projectId: string): Promise<IPCResult<NovelPromptsFile>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const result = await dialog.showOpenDialog({
        title: 'Import Novel Prompts',
        filters: [
          { name: 'Prompt Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Import cancelled' };
      }

      const filePath = result.filePaths[0];
      try {
        const content = await readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content) as { prompts?: unknown; exportTime?: string; type?: string } | unknown[];

        let prompts: unknown[] = [];
        if (Array.isArray(parsed)) {
          prompts = parsed;
        } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { prompts?: unknown }).prompts)) {
          prompts = (parsed as { prompts?: unknown[] }).prompts || [];
        }

        if (!Array.isArray(prompts)) {
          return { success: false, error: 'Invalid prompts file format' };
        }

        const promptsFile: NovelPromptsFile = {
          prompts: prompts as NovelPromptsFile['prompts'],
          exportTime: (parsed as { exportTime?: string }).exportTime || new Date().toISOString(),
          type: 'prompts'
        };

        const novelDir = path.join(project.path, AUTO_BUILD_PATHS.NOVEL_DIR);
        const promptsPath = path.join(novelDir, AUTO_BUILD_PATHS.NOVEL_PROMPTS);
        if (!existsSync(novelDir)) {
          mkdirSync(novelDir, { recursive: true });
        }
        await writeFileWithRetry(promptsPath, JSON.stringify(promptsFile, null, 2), { encoding: 'utf-8' });
        return { success: true, data: promptsFile };
      } catch (error) {
        debugError('[Novel Handler] Failed to import prompts:', error);
        return { success: false, error: 'Failed to import prompts' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.NOVEL_PROMPTS_EXPORT,
    async (_event, projectId: string, prompts: NovelPromptsFile): Promise<IPCResult<{ filePath: string }>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const result = await dialog.showSaveDialog({
        title: 'Export Novel Prompts',
        defaultPath: 'novel-prompts.json',
        filters: [
          { name: 'Prompt Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Export cancelled' };
      }

      const payload: NovelPromptsFile = {
        prompts: prompts.prompts || [],
        exportTime: prompts.exportTime || new Date().toISOString(),
        type: 'prompts'
      };

      try {
        await writeFile(result.filePath, JSON.stringify(payload, null, 2), 'utf-8');
        return { success: true, data: { filePath: result.filePath } };
      } catch (error) {
        debugError('[Novel Handler] Failed to export prompts:', error);
        return { success: false, error: 'Failed to export prompts' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.NOVEL_EXPORT_MARKDOWN,
    async (_, projectId: string): Promise<IPCResult<{ path: string }>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const novelDir = path.join(project.path, AUTO_BUILD_PATHS.NOVEL_DIR);
      const novelPath = path.join(novelDir, AUTO_BUILD_PATHS.NOVEL_FILE);
      const exportPath = path.join(novelDir, AUTO_BUILD_PATHS.NOVEL_EXPORT);

      try {
        if (!existsSync(novelDir)) {
          mkdirSync(novelDir, { recursive: true });
        }
        if (!existsSync(novelPath)) {
          return { success: false, error: 'Novel data not found' };
        }
        const content = await readFileWithRetry(novelPath, { encoding: 'utf-8' }) as string;
        const novel = JSON.parse(content) as NovelProject;
        const markdown = buildNovelMarkdown(novel);
        await writeFileWithRetry(exportPath, markdown, { encoding: 'utf-8' });
        return { success: true, data: { path: exportPath } };
      } catch (error) {
        debugError('[Novel Handler] Failed to export markdown:', error);
        return { success: false, error: 'Failed to export markdown' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.NOVEL_SAVE,
    async (_, projectId: string, novel: NovelProject): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const novelDir = path.join(project.path, AUTO_BUILD_PATHS.NOVEL_DIR);
      const novelPath = path.join(novelDir, AUTO_BUILD_PATHS.NOVEL_FILE);

      try {
        if (!existsSync(novelDir)) {
          mkdirSync(novelDir, { recursive: true });
        }
        const normalizedNovel = normalizeNovel(novel);
        normalizedNovel.updatedAt = new Date().toISOString();
        await writeFileWithRetry(novelPath, JSON.stringify(normalizedNovel, null, 2), { encoding: 'utf-8' });
        return { success: true };
      } catch (error) {
        debugError('[Novel Handler] Failed to save novel:', error);
        return { success: false, error: 'Failed to save novel' };
      }
    }
  );

  ipcMain.on(
    IPC_CHANNELS.NOVEL_GENERATE,
    (_event, projectId: string, request: NovelGenerateRequest) => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        safeSendToRenderer(getMainWindow, IPC_CHANNELS.NOVEL_ERROR, projectId, 'Project not found');
        return;
      }

      const featureSettings = getNovelFeatureSettings();
      const config = { ...featureSettings, ...(request.config || {}) };
      const requestWithSettings: NovelGenerateRequest = {
        ...request,
        config,
      };

      debugLog('[Novel Handler] Starting generation:', {
        projectId,
        action: requestWithSettings.action,
        model: requestWithSettings.config?.model,
        thinkingLevel: requestWithSettings.config?.thinkingLevel,
      });

      agentManager.startNovelGeneration(projectId, project.path, requestWithSettings);

      const getMainWindowRef = () => getMainWindow();
      safeSendToRenderer(getMainWindowRef, IPC_CHANNELS.NOVEL_PROGRESS, projectId, {
        phase: 'running',
        progress: 5,
        message: 'Starting novel generation...'
      } as NovelGenerationStatus);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.NOVEL_STOP,
    async (_event, projectId: string): Promise<IPCResult> => {
      const wasStopped = agentManager.stopNovel(projectId);
      if (wasStopped) {
        safeSendToRenderer(getMainWindow, IPC_CHANNELS.NOVEL_STOPPED, projectId);
      }
      return { success: wasStopped };
    }
  );

  // Forward novel events from agent manager to renderer
  const handleNovelProgress = (projectId: string, status: NovelGenerationStatus): void => {
    safeSendToRenderer(getMainWindow, IPC_CHANNELS.NOVEL_PROGRESS, projectId, status);
  };
  const handleNovelComplete = (projectId: string, novel: NovelProject): void => {
    safeSendToRenderer(getMainWindow, IPC_CHANNELS.NOVEL_COMPLETE, projectId, novel);
  };
  const handleNovelError = (projectId: string, error: string): void => {
    safeSendToRenderer(getMainWindow, IPC_CHANNELS.NOVEL_ERROR, projectId, error);
  };
  const handleNovelStopped = (projectId: string): void => {
    safeSendToRenderer(getMainWindow, IPC_CHANNELS.NOVEL_STOPPED, projectId);
  };

  agentManager.on('novel-progress', handleNovelProgress);
  agentManager.on('novel-complete', handleNovelComplete);
  agentManager.on('novel-error', handleNovelError);
  agentManager.on('novel-stopped', handleNovelStopped);

  // Cleanup listeners on app exit - use app 'will-quit' for Electron apps
  const cleanup = () => {
    agentManager.off('novel-progress', handleNovelProgress);
    agentManager.off('novel-complete', handleNovelComplete);
    agentManager.off('novel-error', handleNovelError);
    agentManager.off('novel-stopped', handleNovelStopped);
  };

  app.on('will-quit', cleanup);

  // ===== Novel Workflow IPC Handlers =====

  // In-memory storage for custom workflows (persisted to disk)
  const customWorkflows: Map<string, NovelWorkflow> = new Map();

  // Get all workflows (templates + custom)
  ipcMain.handle(
    IPC_CHANNELS.NOVEL_WORKFLOWS_GET,
    async (): Promise<IPCResult<NovelWorkflow[]>> => {
      try {
        // Return custom workflows stored in memory
        // In production, this would load from disk
        const workflows = Array.from(customWorkflows.values());
        return { success: true, data: workflows };
      } catch (error) {
        debugError('[Novel Handler] Failed to get workflows:', error);
        return { success: false, error: 'Failed to get workflows' };
      }
    }
  );

  // Save a workflow
  ipcMain.handle(
    IPC_CHANNELS.NOVEL_WORKFLOW_SAVE,
    async (_, workflow: NovelWorkflow): Promise<IPCResult> => {
      try {
        customWorkflows.set(workflow.id, workflow);
        return { success: true };
      } catch (error) {
        debugError('[Novel Handler] Failed to save workflow:', error);
        return { success: false, error: 'Failed to save workflow' };
      }
    }
  );

  // Delete a workflow
  ipcMain.handle(
    IPC_CHANNELS.NOVEL_WORKFLOW_DELETE,
    async (_, workflowId: string): Promise<IPCResult> => {
      try {
        const deleted = customWorkflows.delete(workflowId);
        if (!deleted) {
          return { success: false, error: 'Workflow not found' };
        }
        return { success: true };
      } catch (error) {
        debugError('[Novel Handler] Failed to delete workflow:', error);
        return { success: false, error: 'Failed to delete workflow' };
      }
    }
  );

  // Execute a workflow step (placeholder - requires backend implementation)
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_STEP_EXECUTE,
    async (_, params: {
      workflowId: string;
      stepId: string;
      promptTemplate: string;
      params: Record<string, unknown>;
      maxTokens?: number;
      projectId?: string;
    }): Promise<IPCResult<{ data: string; tokensUsed?: number }>> => {
      try {
        debugLog('[Novel Handler] Workflow step execute called:', params);

        const autoBuildSource = getEffectiveSourcePath();
        const backendPath = autoBuildSource;

        if (!pythonEnvManager.isEnvReady()) {
          const status = await pythonEnvManager.initialize(autoBuildSource);
          if (!status.ready) {
            return { success: false, error: status.error || 'Python environment not ready' };
          }
        }

        let projectDir = autoBuildSource;
        if (params.projectId) {
          const project = projectStore.getProject(params.projectId);
          if (!project) {
            return { success: false, error: 'Project not found' };
          }
          projectDir = project.path;
        }

        const pythonPath = getConfiguredPythonPath();
        const [pythonCommand, pythonBaseArgs] = parsePythonCommand(pythonPath);

        const pythonEnv = pythonEnvManager.getPythonEnv();
        const apiProfileEnv = await getAPIProfileEnv();
        const oauthModeClearVars = getOAuthModeClearVars(apiProfileEnv);
        const profileResult = getBestAvailableProfileEnv();
        const profileEnv = profileResult.env;

        const pythonPathParts: string[] = [];
        if (pythonEnv.PYTHONPATH) {
          pythonPathParts.push(pythonEnv.PYTHONPATH);
        }
        pythonPathParts.push(backendPath);
        const combinedPythonPath = pythonPathParts.join(getPathDelimiter());

        const env: Record<string, string | undefined> = {
          ...process.env,
          ...pythonEnv,
          ...oauthModeClearVars,
          ...profileEnv,
          ...apiProfileEnv,
          PYTHONPATH: combinedPythonPath,
          PYTHONUNBUFFERED: '1',
          PYTHONUTF8: '1',
        };
        delete env.CLAUDECODE;

        const renderedPrompt = renderTemplate(params.promptTemplate, params.params || {});
        const featureSettings = getNovelFeatureSettings();
        const stepConfig = {
          ...featureSettings,
          maxTokens: params.maxTokens
        };

        const pythonScript = `
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, ${JSON.stringify(backendPath)})

from novel.generator import run_generation
from phase_config import sanitize_thinking_level

async def main():
    payload = json.loads(sys.stdin.read() or '{}')
    config = payload.get('config', {})
    prompt = payload.get('prompt', '')
    model = config.get('model', 'sonnet')
    thinking = sanitize_thinking_level(config.get('thinkingLevel', 'medium'))
    fast_mode = bool(config.get('fastMode', False))

    project_dir = Path(${JSON.stringify(projectDir)})
    output_dir = project_dir / '.auto-claude' / 'novel'
    output_dir.mkdir(parents=True, exist_ok=True)

    text = await run_generation(prompt, project_dir, output_dir, model, thinking, fast_mode)
    print(json.dumps({'type': 'result', 'data': {'data': text}}))

asyncio.run(main())
`;

        return await new Promise((resolve) => {
          const child = spawn(pythonCommand, [...pythonBaseArgs, '-c', pythonScript], {
            cwd: autoBuildSource,
            env,
          });

          child.stdin?.write(JSON.stringify({
            prompt: renderedPrompt,
            config: stepConfig
          }));
          child.stdin?.end();

          let output = '';
          let errorOutput = '';

          child.stdout?.on('data', (data: Buffer) => {
            output += data.toString('utf-8');
          });

          child.stderr?.on('data', (data: Buffer) => {
            errorOutput += data.toString('utf-8');
          });

          child.on('close', (code: number | null) => {
            if (code !== 0) {
              resolve({
                success: false,
                error: errorOutput.trim() || `Workflow step failed with exit code ${code}`
              });
              return;
            }

            const result = extractStepResult(output) || { data: output.trim() };
            resolve({ success: true, data: result });
          });
        });
      } catch (error) {
        debugError('[Novel Handler] Failed to execute workflow step:', error);
        return { success: false, error: 'Failed to execute workflow step' };
      }
    }
  );
}
