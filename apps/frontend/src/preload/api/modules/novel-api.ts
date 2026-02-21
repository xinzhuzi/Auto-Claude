import { IPC_CHANNELS } from '../../../shared/constants';
import type {
  NovelProject,
  NovelCharacter,
  NovelGenerateRequest,
  NovelGenerationStatus,
  NovelDocumentConfig,
  NovelPromptsFile,
  NovelWorkflow,
  IPCResult
} from '../../../shared/types';
import { createIpcListener, invokeIpc, sendIpc, IpcListenerCleanup } from './ipc-utils';

/**
 * Novel API operations
 */
export interface NovelAPI {
  // Operations
  getNovel: (projectId: string) => Promise<IPCResult<NovelProject | null>>;
  saveNovel: (projectId: string, novel: NovelProject) => Promise<IPCResult>;
  generateNovel: (projectId: string, request: NovelGenerateRequest) => void;
  stopNovel: (projectId: string) => Promise<IPCResult>;
  getNovelConfig: (projectId: string) => Promise<IPCResult<NovelDocumentConfig>>;
  saveNovelConfig: (projectId: string, config: NovelDocumentConfig) => Promise<IPCResult>;
  getNovelPrompts: (projectId: string) => Promise<IPCResult<NovelPromptsFile>>;
  saveNovelPrompts: (projectId: string, prompts: NovelPromptsFile) => Promise<IPCResult>;
  importNovelPrompts: (projectId: string) => Promise<IPCResult<NovelPromptsFile>>;
  exportNovelPrompts: (projectId: string, prompts: NovelPromptsFile) => Promise<IPCResult<{ filePath: string }>>;
  exportNovelMarkdown: (projectId: string) => Promise<IPCResult<{ path: string }>>;
  getNovelOverviewPreface: (projectId: string) => Promise<IPCResult<{ filePath: string; content: string }>>;
  loadNovelCharactersFromDocs: (projectId: string) => Promise<IPCResult<NovelCharacter[]>>;
  createNovelCharacterDoc: (projectId: string) => Promise<IPCResult<NovelCharacter | null>>;

  // Workflow operations
  getNovelWorkflows: () => Promise<IPCResult<NovelWorkflow[]>>;
  saveNovelWorkflow: (workflow: NovelWorkflow) => Promise<IPCResult>;
  deleteNovelWorkflow: (workflowId: string) => Promise<IPCResult>;
  executeWorkflowStep: (params: {
    workflowId: string;
    stepId: string;
    promptTemplate: string;
    params: Record<string, unknown>;
    maxTokens?: number;
    projectId?: string;
  }) => Promise<IPCResult<{ data: string; tokensUsed?: number }>>;

  // Event listeners
  onNovelProgress: (
    callback: (projectId: string, status: NovelGenerationStatus) => void
  ) => IpcListenerCleanup;
  onNovelComplete: (
    callback: (projectId: string, novel: NovelProject) => void
  ) => IpcListenerCleanup;
  onNovelError: (
    callback: (projectId: string, error: string) => void
  ) => IpcListenerCleanup;
  onNovelStopped: (
    callback: (projectId: string) => void
  ) => IpcListenerCleanup;
}

/**
 * Creates the Novel API implementation
 */
export const createNovelAPI = (): NovelAPI => ({
  getNovel: (projectId: string): Promise<IPCResult<NovelProject | null>> =>
    invokeIpc(IPC_CHANNELS.NOVEL_GET, projectId),

  saveNovel: (projectId: string, novel: NovelProject): Promise<IPCResult> =>
    invokeIpc(IPC_CHANNELS.NOVEL_SAVE, projectId, novel),

  generateNovel: (projectId: string, request: NovelGenerateRequest): void =>
    sendIpc(IPC_CHANNELS.NOVEL_GENERATE, projectId, request),

  stopNovel: (projectId: string): Promise<IPCResult> =>
    invokeIpc(IPC_CHANNELS.NOVEL_STOP, projectId),

  getNovelConfig: (projectId: string): Promise<IPCResult<NovelDocumentConfig>> =>
    invokeIpc(IPC_CHANNELS.NOVEL_CONFIG_GET, projectId),

  saveNovelConfig: (projectId: string, config: NovelDocumentConfig): Promise<IPCResult> =>
    invokeIpc(IPC_CHANNELS.NOVEL_CONFIG_SAVE, projectId, config),

  getNovelPrompts: (projectId: string): Promise<IPCResult<NovelPromptsFile>> =>
    invokeIpc(IPC_CHANNELS.NOVEL_PROMPTS_GET, projectId),

  saveNovelPrompts: (projectId: string, prompts: NovelPromptsFile): Promise<IPCResult> =>
    invokeIpc(IPC_CHANNELS.NOVEL_PROMPTS_SAVE, projectId, prompts),

  importNovelPrompts: (projectId: string): Promise<IPCResult<NovelPromptsFile>> =>
    invokeIpc(IPC_CHANNELS.NOVEL_PROMPTS_IMPORT, projectId),

  exportNovelPrompts: (projectId: string, prompts: NovelPromptsFile): Promise<IPCResult<{ filePath: string }>> =>
    invokeIpc(IPC_CHANNELS.NOVEL_PROMPTS_EXPORT, projectId, prompts),

  exportNovelMarkdown: (projectId: string): Promise<IPCResult<{ path: string }>> =>
    invokeIpc(IPC_CHANNELS.NOVEL_EXPORT_MARKDOWN, projectId),

  getNovelOverviewPreface: (projectId: string): Promise<IPCResult<{ filePath: string; content: string }>> =>
    invokeIpc(IPC_CHANNELS.NOVEL_OVERVIEW_PREFACE_GET, projectId),

  loadNovelCharactersFromDocs: (projectId: string): Promise<IPCResult<NovelCharacter[]>> =>
    invokeIpc(IPC_CHANNELS.NOVEL_CHARACTERS_LOAD_FROM_DOCS, projectId),

  createNovelCharacterDoc: (projectId: string): Promise<IPCResult<NovelCharacter | null>> =>
    invokeIpc(IPC_CHANNELS.NOVEL_CHARACTER_DOC_CREATE, projectId),

  // Workflow operations
  getNovelWorkflows: (): Promise<IPCResult<NovelWorkflow[]>> =>
    invokeIpc(IPC_CHANNELS.NOVEL_WORKFLOWS_GET),

  saveNovelWorkflow: (workflow: NovelWorkflow): Promise<IPCResult> =>
    invokeIpc(IPC_CHANNELS.NOVEL_WORKFLOW_SAVE, workflow),

  deleteNovelWorkflow: (workflowId: string): Promise<IPCResult> =>
    invokeIpc(IPC_CHANNELS.NOVEL_WORKFLOW_DELETE, workflowId),

  executeWorkflowStep: (params: {
    workflowId: string;
    stepId: string;
    promptTemplate: string;
    params: Record<string, unknown>;
    maxTokens?: number;
    projectId?: string;
  }): Promise<IPCResult<{ data: string; tokensUsed?: number }>> =>
    invokeIpc(IPC_CHANNELS.WORKFLOW_STEP_EXECUTE, params),

  onNovelProgress: (
    callback: (projectId: string, status: NovelGenerationStatus) => void
  ): IpcListenerCleanup =>
    createIpcListener(IPC_CHANNELS.NOVEL_PROGRESS, callback),

  onNovelComplete: (
    callback: (projectId: string, novel: NovelProject) => void
  ): IpcListenerCleanup =>
    createIpcListener(IPC_CHANNELS.NOVEL_COMPLETE, callback),

  onNovelError: (
    callback: (projectId: string, error: string) => void
  ): IpcListenerCleanup =>
    createIpcListener(IPC_CHANNELS.NOVEL_ERROR, callback),

  onNovelStopped: (
    callback: (projectId: string) => void
  ): IpcListenerCleanup =>
    createIpcListener(IPC_CHANNELS.NOVEL_STOPPED, callback)
});
