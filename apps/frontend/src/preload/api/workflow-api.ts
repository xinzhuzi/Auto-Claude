/**
 * Workflow API
 *
 * Preload API for workflow operations.
 * Bridges renderer process to main process IPC handlers.
 */

import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type {
  IPCResult,
  Workflow,
  ExecutionConfig,
  ExecutionRecord,
  ExecutionLog,
  WorkflowTemplate
} from '../../shared/types';

export interface WorkflowAPI {
  // Workflow CRUD operations
  createWorkflow: (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>) => Promise<IPCResult<Workflow>>;
  saveWorkflow: (workflow: Workflow) => Promise<IPCResult<Workflow>>;
  saveWorkflowToProject: (workflow: Workflow, projectPath: string) => Promise<IPCResult<Workflow>>;
  loadWorkflow: (id: string) => Promise<IPCResult<Workflow>>;
  listWorkflows: () => Promise<IPCResult<Workflow[]>>;
  deleteWorkflow: (id: string) => Promise<IPCResult<void>>;
  duplicateWorkflow: (id: string) => Promise<IPCResult<Workflow>>;
  exportWorkflow: (workflowId: string) => Promise<IPCResult<{ filePath: string }>>;
  exportWorkflowToProject: (workflow: Workflow, mdContent: string, projectPath: string) => Promise<IPCResult<{ filePath: string }>>;
  importWorkflow: () => Promise<IPCResult<Workflow>>;
  selectProjectDirectory: () => Promise<IPCResult<string>>;
  getAutoClaudeProjectPath: () => Promise<IPCResult<string>>;
  listWorkflowsFromProject: (projectPath: string) => Promise<IPCResult<Workflow[]>>;
  loadWorkflowFromProject: (workflowName: string, projectPath: string) => Promise<IPCResult<Workflow>>;

  // Execution operations
  executeWorkflow: (workflow: Workflow, config?: ExecutionConfig) => Promise<IPCResult<string>>;
  executeWorkflowStream: (workflow: Workflow) => Promise<IPCResult<void>>;
  pauseExecution: (executionId: string) => Promise<IPCResult<void>>;
  resumeExecution: (executionId: string) => Promise<IPCResult<void>>;
  stopExecution: (executionId: string) => Promise<IPCResult<void>>;
  getExecutionStatus: (executionId: string) => Promise<IPCResult<ExecutionRecord>>;
  getExecutionLogs: (executionId: string) => Promise<IPCResult<ExecutionLog[]>>;

  // Node operations
  validateNode: (nodeType: string, nodeData: unknown) => Promise<IPCResult<{ valid: boolean; errors: string[] }>>;

  // Template operations
  listTemplates: () => Promise<IPCResult<WorkflowTemplate[]>>;
  applyTemplate: (templateId: string) => Promise<IPCResult<Workflow>>;

  // Event listeners
  onWorkflowExecutionProgress: (callback: (data: { executionId: string; workflowId: string; status: string; currentNodeId?: string }) => void) => () => void;
  onWorkflowExecutionComplete: (callback: (data: { executionId: string; workflowId: string; status: string }) => void) => () => void;
  onWorkflowExecutionError: (callback: (data: { executionId: string; workflowId: string; error: string }) => void) => () => void;
  onWorkflowNodeExecuted: (callback: (data: { executionId: string; nodeId: string; status: string }) => void) => () => void;

  // Streaming execution event listeners
  onWorkflowStreamChunk: (callback: (chunk: string) => void) => () => void;
  onWorkflowStreamComplete: (callback: () => void) => () => void;
  onWorkflowStreamError: (callback: (error: string) => void) => () => void;

  // Command execution (Claude CLI subprocess)
  executeCommand: (commandName: string, projectPath: string) => Promise<IPCResult<string>>;
  onWorkflowCommandOutput: (callback: (executionId: string, data: string) => void) => () => void;
  onWorkflowCommandComplete: (callback: (executionId: string) => void) => () => void;
  onWorkflowCommandError: (callback: (executionId: string, error: string) => void) => () => void;

  // AI generation
  aiGenerate: (request: { description: string; context?: string; projectPath: string }) => Promise<IPCResult<{ workflow: Workflow; iterations: number; suggestions?: Array<{ message: string }> }>>;
  aiGenerateSkill: (request: { description: string; skillName?: string; context?: string; projectPath: string; overwrite?: boolean }) => Promise<IPCResult<{ workflow: Workflow }>>;
  aiOptimize: (request: { workflow: Workflow; optimizationRequest: string; conversationHistory?: Array<{ role: string; content: string }>; projectPath: string }) => Promise<IPCResult<{ workflow: Workflow; summary?: string }>>;
  aiSuggest: (request: { workflow: Workflow; projectPath: string }) => Promise<IPCResult<{ suggestions: Array<{ description?: string; message?: string }> }>>;

  // User input
  submitUserInput: (request: { requestId: string; response: any; cancelled: boolean }) => Promise<IPCResult<void>>;
  cancelUserInput: (requestId: string) => Promise<IPCResult<void>>;
  onUserInputRequest: (callback: (request: { requestId: string; question: string; options?: string[]; multiSelect?: boolean }) => void) => () => void;

  // Agent operations (for SubAgent node)
  listAgentsFromProject: (projectPath: string) => Promise<IPCResult<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    icon?: string;
    filePath: string;
  }>>>;

  // Command operations (for Command node)
  listCommandsFromProject: (projectPath: string) => Promise<IPCResult<Array<{
    name: string;
    description: string;
    commandPath: string;
    validationStatus: 'valid' | 'missing' | 'invalid';
  }>>>;
}

export const createWorkflowAPI = (): WorkflowAPI => {
  // Event listener management
  const eventListeners = new Map<string, (event: Electron.IpcRendererEvent, ...args: unknown[]) => void>();

  const createEventListener = <T extends (...args: any[]) => void>(
    channel: string,
    callback: T
  ): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    eventListeners.set(channel, listener);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(channel, listener);
      eventListeners.delete(channel);
    };
  };

  return {
    // Workflow CRUD operations
    createWorkflow: (workflow) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_CREATE, workflow),

    saveWorkflow: (workflow) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_SAVE, workflow),

    loadWorkflow: (id) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_LOAD, id),

    listWorkflows: () =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_LIST),

    deleteWorkflow: (id) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_DELETE, id),

    duplicateWorkflow: (id) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_DUPLICATE, id),

    exportWorkflow: (workflowId) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_EXPORT, { workflowId }),

    exportWorkflowToProject: (workflow, mdContent, projectPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_EXPORT_TO_PROJECT, workflow, mdContent, projectPath),

    importWorkflow: () =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_OPEN_FILE_PICKER),

    selectProjectDirectory: () =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_SELECT_PROJECT_DIR),

    getAutoClaudeProjectPath: () =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_GET_PROJECT_PATH),

    saveWorkflowToProject: (workflow, projectPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_SAVE_TO_PROJECT, workflow, projectPath),

    listWorkflowsFromProject: (projectPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_LIST_FROM_PROJECT, projectPath),

    loadWorkflowFromProject: (workflowName, projectPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_LOAD_FROM_PROJECT, workflowName, projectPath),

    // Execution operations
    executeWorkflow: (workflow, config) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_EXECUTE, workflow, config),

    executeWorkflowStream: (workflow) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_EXECUTE_STREAM, workflow),

    pauseExecution: (executionId) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_PAUSE, executionId),

    resumeExecution: (executionId) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_RESUME, executionId),

    stopExecution: (executionId) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_STOP, executionId),

    getExecutionStatus: (executionId) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_GET_EXECUTION_STATUS, executionId),

    getExecutionLogs: (executionId) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_GET_EXECUTION_LOGS, executionId),

    // Node operations
    validateNode: (nodeType, nodeData) =>
      ipcRenderer.invoke(IPC_CHANNELS.NODE_VALIDATE, nodeType, nodeData),

    // Template operations
    listTemplates: () =>
      ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_LIST),

    applyTemplate: (templateId) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_APPLY, templateId),

    // Event listeners
    onWorkflowExecutionProgress: (callback) =>
      createEventListener(IPC_CHANNELS.WORKFLOW_EXECUTION_PROGRESS, callback),

    onWorkflowExecutionComplete: (callback) =>
      createEventListener(IPC_CHANNELS.WORKFLOW_EXECUTION_COMPLETE, callback),

    onWorkflowExecutionError: (callback) =>
      createEventListener(IPC_CHANNELS.WORKFLOW_EXECUTION_ERROR, callback),

    onWorkflowNodeExecuted: (callback) =>
      createEventListener(IPC_CHANNELS.WORKFLOW_NODE_EXECUTED, callback),

    // Streaming execution event listeners
    onWorkflowStreamChunk: (callback) =>
      createEventListener(IPC_CHANNELS.WORKFLOW_STREAM_CHUNK, callback),

    onWorkflowStreamComplete: (callback) =>
      createEventListener(IPC_CHANNELS.WORKFLOW_STREAM_COMPLETE, callback),

    onWorkflowStreamError: (callback) =>
      createEventListener(IPC_CHANNELS.WORKFLOW_STREAM_ERROR, callback),

    // Command execution (Claude CLI subprocess)
    executeCommand: (commandName, projectPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_EXECUTE_COMMAND, commandName, projectPath),

    onWorkflowCommandOutput: (callback) =>
      createEventListener(IPC_CHANNELS.WORKFLOW_COMMAND_OUTPUT, callback),

    onWorkflowCommandComplete: (callback) =>
      createEventListener(IPC_CHANNELS.WORKFLOW_COMMAND_COMPLETE, callback),

    onWorkflowCommandError: (callback) =>
      createEventListener(IPC_CHANNELS.WORKFLOW_COMMAND_ERROR, callback),

    // AI generation
    aiGenerate: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_AI_GENERATE, request),

    aiGenerateSkill: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_AI_GENERATE_SKILL, request),

    aiOptimize: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_AI_OPTIMIZE, request),

    aiSuggest: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_AI_SUGGEST, request),

    // User input
    submitUserInput: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_SUBMIT_USER_INPUT, request),

    cancelUserInput: (requestId) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_CANCEL_USER_INPUT, requestId),

    onUserInputRequest: (callback) =>
      createEventListener(IPC_CHANNELS.WORKFLOW_USER_INPUT_REQUEST, callback),

    // Agent operations (for SubAgent node)
    listAgentsFromProject: (projectPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.AGENT_LIST_FROM_PROJECT, projectPath),

    // Command operations (for Command node)
    listCommandsFromProject: (projectPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.COMMAND_LIST_FROM_PROJECT, projectPath),
  };
};
