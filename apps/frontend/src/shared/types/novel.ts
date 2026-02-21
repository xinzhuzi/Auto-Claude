import type { ModelTypeShort, ThinkingLevel } from './settings';

export type NovelChapterStatus = 'draft' | 'completed';

export interface NovelChapter {
  id: string;
  title: string;
  outline: string;
  content: string;
  generatedText?: string;
  status: NovelChapterStatus;
}

export interface NovelCharacter {
  id: string;
  name?: string;
  description?: string;
  traits?: string[];
  personality?: string;
  appearance?: string;
  background?: string;
  category?: string;
  content?: string;
  sourcePath?: string;
  [key: string]: unknown;
}

export interface NovelWorldSetting {
  id: string;
  title?: string;
  description?: string;
  [key: string]: unknown;
}

export interface NovelPromptTemplate {
  id: string;
  title: string;
  category: string;
  description?: string;
  content: string;
  tags?: string[];
  usageCount?: number;
}

export interface NovelPromptsFile {
  prompts: NovelPromptTemplate[];
  exportTime?: string;
  type?: string;
}

export interface NovelProject {
  id: string;
  title: string;
  genre: string;
  theme: string;
  intro: string;
  keywords: string;
  outline: string;
  content: string;
  generatedContent: string;
  chapters: NovelChapter[];
  characters: NovelCharacter[];
  worldSettings: NovelWorldSetting[];
  prompts?: NovelPromptTemplate[];
  createdAt: string;
  updatedAt: string;
}

export type NovelModuleId =
  | 'overview'
  | 'creative'
  | 'workflow'
  | 'outline'
  | 'characters'
  | 'world'
  | 'content'
  | 'output'
  | 'prompts';

export interface NovelDocumentConfig {
  version: 1;
  modulePaths: Record<NovelModuleId, string>;
  createdAt: string;
  updatedAt: string;
}

export type NovelAction =
  | 'outline'
  | 'chapter'
  | 'continue'
  | 'polish'
  | 'summary'
  | 'advice'
  | 'creative'
  | 'character'
  | 'world';

export interface NovelGenerateConfig {
  model?: ModelTypeShort;
  thinkingLevel?: ThinkingLevel;
  fastMode?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface NovelGenerateRequest {
  action: NovelAction;
  payload: Record<string, unknown>;
  config?: NovelGenerateConfig;
}

export interface NovelGenerationStatus {
  phase: 'idle' | 'running' | 'complete' | 'error';
  progress: number;
  message: string;
  action?: NovelAction;
  startedAt?: string;
  lastActivityAt?: string;
}

// ===== 小说工作流系统 =====

export type WorkflowCategory =
  | 'short-story'   // 短篇
  | 'long-story'    // 长篇
  | 'continuation'  // 续写
  | 'outline'       // 大纲
  | 'polish'        // 润色
  | 'character'     // 人物
  | 'world';        // 世界观

export type InputParamType =
  | 'book'         // 书籍选择器
  | 'chapter'      // 章节选择器（多选）
  | 'character'    // 角色卡选择器
  | 'term'         // 词条卡选择器
  | 'memo'         // 备忘录关联
  | 'text'         // 文本输入
  | 'textarea'     // 多行文本
  | 'select'       // 下拉选择
  | 'number';      // 数字输入

export type NovelFieldBinding =
  | 'title'
  | 'genre'
  | 'theme'
  | 'outline'
  | 'chapters'
  | 'characters'
  | 'worldSettings';

export interface WorkflowInputParam {
  name: string;
  label: string;
  type: InputParamType;
  required: boolean;
  defaultValue?: string;
  placeholder?: string;
  description?: string;
  options?: string[];
  binding?: NovelFieldBinding;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  promptTemplate: string;
  outputType: 'text' | 'chapter' | 'outline' | 'character';
  maxTokens?: number;
}

export interface NovelWorkflow {
  id: string;
  name: string;
  description: string;
  author: string;
  authorId?: string;
  avatar?: string;
  rating: number;
  usageCount: number;
  category: WorkflowCategory;
  tags?: string[];
  steps: WorkflowStep[];
  inputParams: WorkflowInputParam[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StepResult {
  stepId: string;
  stepName: string;
  output: string;
  tokensUsed?: number;
  executedAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  projectId: string;
  params: Record<string, unknown>;
  mode: 'step' | 'auto';
  status: 'pending' | 'running' | 'completed' | 'error';
  currentStep?: number;
  results: StepResult[];
  startedAt: string;
  completedAt?: string;
}
