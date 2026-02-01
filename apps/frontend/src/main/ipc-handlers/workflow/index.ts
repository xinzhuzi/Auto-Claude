/**
 * Workflow Studio IPC Handlers
 *
 * Handles all workflow-related IPC communication between main and renderer processes.
 * Follows Auto-Claude's handler pattern with type safety and security validation.
 *
 * Reuses file-handlers validation logic and IPCResult type system.
 */

import { ipcMain, BrowserWindow } from 'electron';
import { writeFile, readFile, mkdir, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IPC_CHANNELS } from '../../../shared/constants';
import type { IPCResult, Workflow, ExecutionConfig, ExecutionRecord, WorkflowTemplate } from '../../../shared/types';
import { validatePath } from '../file-handlers';
import { logger } from '../../lib/logger';
import { registerUserInputHandlers } from './user-input';
import { registerAIGenerationHandlers } from './ai-generation';
import { registerFileOperationHandlers } from './file-operations';
import { registerExportHandlers } from './export';

// Workflow storage directory (in user's home directory)
const WORKSPACE_DIR = path.join(process.env.HOME || '', '.auto-claude', 'workflows');
const TEMPLATES_DIR = path.join(process.env.HOME || '', '.auto-claude', 'workflow-templates');

// Ensure directories exist on handler registration
async function ensureDirectories(): Promise<void> {
  try {
    if (!existsSync(WORKSPACE_DIR)) {
      await mkdir(WORKSPACE_DIR, { recursive: true });
    }
    if (!existsSync(TEMPLATES_DIR)) {
      await mkdir(TEMPLATES_DIR, { recursive: true });
    }
  } catch (error) {
    logger.error('Failed to create workflow directories:', error);
  }
}

/**
 * Register all workflow-related IPC handlers
 */
export function registerWorkflowHandlers(): void {
  // Initialize directories
  ensureDirectories().catch(logger.error);

  // Register user input handlers
  registerUserInputHandlers();

  // Register AI generation handlers
  registerAIGenerationHandlers();

  // Register file operation handlers
  registerFileOperationHandlers();

  // Register export handlers
  registerExportHandlers();

  // ============================================
  // Workflow CRUD Operations
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_CREATE,
    async (_, workflowData: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<IPCResult<Workflow>> => {
      try {
        const id = uuidv4();
        const now = new Date().toISOString();

        const workflow: Workflow = {
          ...workflowData,
          id,
          createdAt: now,
          updatedAt: now,
        };

        // Save to file
        const filePath = path.join(WORKSPACE_DIR, `${id}.json`);
        await writeFile(filePath, JSON.stringify(workflow, null, 2), 'utf-8');

        return { success: true, data: workflow };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create workflow'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_SAVE,
    async (_, workflow: Workflow): Promise<IPCResult<Workflow>> => {
      try {
        // Update timestamp
        workflow.updatedAt = new Date().toISOString();

        // Save to file
        const filePath = path.join(WORKSPACE_DIR, `${workflow.id}.json`);
        await writeFile(filePath, JSON.stringify(workflow, null, 2), 'utf-8');

        return { success: true, data: workflow };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save workflow'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_LOAD,
    async (_, workflowId: string): Promise<IPCResult<Workflow>> => {
      try {
        // Validate ID format (UUID)
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workflowId)) {
          return { success: false, error: 'Invalid workflow ID format' };
        }

        const filePath = path.join(WORKSPACE_DIR, `${workflowId}.json`);

        if (!existsSync(filePath)) {
          return { success: false, error: 'Workflow not found' };
        }

        const content = await readFile(filePath, 'utf-8');
        const workflow = JSON.parse(content) as Workflow;

        return { success: true, data: workflow };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load workflow'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_LIST,
    async (): Promise<IPCResult<Workflow[]>> => {
      try {
        const files = await readdir(WORKSPACE_DIR);
        const workflows: Workflow[] = [];

        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(WORKSPACE_DIR, file);
            const content = await readFile(filePath, 'utf-8');
            const workflow = JSON.parse(content) as Workflow;
            workflows.push(workflow);
          }
        }

        // Sort by updated date descending
        workflows.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        return { success: true, data: workflows };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list workflows'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_DELETE,
    async (_, workflowId: string): Promise<IPCResult<void>> => {
      try {
        const filePath = path.join(WORKSPACE_DIR, `${workflowId}.json`);

        if (!existsSync(filePath)) {
          return { success: false, error: 'Workflow not found' };
        }

        await unlink(filePath);
        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete workflow'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_DUPLICATE,
    async (_, workflowId: string): Promise<IPCResult<Workflow>> => {
      try {
        // Load original workflow directly
        const filePath = path.join(WORKSPACE_DIR, `${workflowId}.json`);
        if (!existsSync(filePath)) {
          return { success: false, error: 'Workflow not found' };
        }

        const content = await readFile(filePath, 'utf-8');
        const original = JSON.parse(content) as Workflow;

        // Create duplicate with new ID
        const id = uuidv4();
        const now = new Date().toISOString();

        const duplicate: Workflow = {
          ...original,
          id,
          name: `${original.name} (Copy)`,
          createdAt: now,
          updatedAt: now,
        };

        // Save duplicate to file
        const duplicateFilePath = path.join(WORKSPACE_DIR, `${id}.json`);
        await writeFile(duplicateFilePath, JSON.stringify(duplicate, null, 2), 'utf-8');

        return { success: true, data: duplicate };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to duplicate workflow'
        };
      }
    }
  );

  // ============================================
  // Project-level Save and Export Operations
  // ============================================

  // Get Auto-Claude project path
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_GET_PROJECT_PATH,
    async (): Promise<IPCResult<string>> => {
      try {
        const { app } = await import('electron');
        const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
        const projectPath = isDev
          ? path.resolve(__dirname, '..', '..', '..', '..', '..')
          : path.dirname(app.getAppPath());
        return { success: true, data: projectPath };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get project path'
        };
      }
    }
  );

  // Select project directory
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_SELECT_PROJECT_DIR,
    async (): Promise<IPCResult<string>> => {
      try {
        const { dialog } = await import('electron');
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory'],
          title: '选择项目目录',
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, error: 'No directory selected' };
        }

        return { success: true, data: result.filePaths[0] };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to select directory'
        };
      }
    }
  );

  // Save workflow to project .auto-claude/workflows/
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_SAVE_TO_PROJECT,
    async (_, workflow: Workflow, projectPath: string): Promise<IPCResult<Workflow>> => {
      try {
        // Validate project path
        if (!projectPath || !existsSync(projectPath)) {
          return { success: false, error: 'Invalid project path' };
        }

        // Create .auto-claude/workflows directory if it doesn't exist
        const workflowsDir = path.join(projectPath, '.auto-claude', 'workflows');
        if (!existsSync(workflowsDir)) {
          await mkdir(workflowsDir, { recursive: true });
        }

        // Update timestamp
        workflow.updatedAt = new Date().toISOString();

        // Save to file using workflow name as filename
        const fileName = workflow.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
        const filePath = path.join(workflowsDir, `${fileName}.json`);
        await writeFile(filePath, JSON.stringify(workflow, null, 2), 'utf-8');

        logger.info(`[Workflow] Saved to project: ${filePath}`);
        return { success: true, data: workflow };
      } catch (error) {
        logger.error('[Workflow] Failed to save to project:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save workflow to project'
        };
      }
    }
  );

  // List workflows from project .auto-claude/workflows/
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_LIST_FROM_PROJECT,
    async (_, projectPath: string): Promise<IPCResult<Workflow[]>> => {
      try {
        // Validate project path
        if (!projectPath || !existsSync(projectPath)) {
          return { success: false, error: 'Invalid project path' };
        }

        const workflowsDir = path.join(projectPath, '.auto-claude', 'workflows');

        // If directory doesn't exist, return empty list
        if (!existsSync(workflowsDir)) {
          return { success: true, data: [] };
        }

        const files = await readdir(workflowsDir);
        const workflows: Workflow[] = [];

        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const filePath = path.join(workflowsDir, file);
              const content = await readFile(filePath, 'utf-8');
              const workflow = JSON.parse(content) as Workflow;
              workflows.push(workflow);
            } catch (parseError) {
              logger.warn(`[Workflow] Failed to parse ${file}:`, parseError);
            }
          }
        }

        // Sort by updated date descending
        workflows.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        logger.info(`[Workflow] Listed ${workflows.length} workflows from project: ${projectPath}`);
        return { success: true, data: workflows };
      } catch (error) {
        logger.error('[Workflow] Failed to list workflows from project:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list workflows from project'
        };
      }
    }
  );

  // Load workflow from project .auto-claude/workflows/
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_LOAD_FROM_PROJECT,
    async (_, workflowName: string, projectPath: string): Promise<IPCResult<Workflow>> => {
      try {
        // Validate project path
        if (!projectPath || !existsSync(projectPath)) {
          return { success: false, error: 'Invalid project path' };
        }

        const workflowsDir = path.join(projectPath, '.auto-claude', 'workflows');
        const filePath = path.join(workflowsDir, `${workflowName}.json`);

        if (!existsSync(filePath)) {
          return { success: false, error: 'Workflow not found' };
        }

        const content = await readFile(filePath, 'utf-8');
        const workflow = JSON.parse(content) as Workflow;

        logger.info(`[Workflow] Loaded workflow from project: ${filePath}`);
        return { success: true, data: workflow };
      } catch (error) {
        logger.error('[Workflow] Failed to load workflow from project:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load workflow from project'
        };
      }
    }
  );

  // Export workflow to project .claude/commands/
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_EXPORT_TO_PROJECT,
    async (_, workflow: Workflow, mdContent: string, projectPath: string): Promise<IPCResult<{ filePath: string }>> => {
      try {
        // Validate project path
        if (!projectPath || !existsSync(projectPath)) {
          return { success: false, error: 'Invalid project path' };
        }

        // Create .claude/commands directory if it doesn't exist
        const commandsDir = path.join(projectPath, '.claude', 'commands');
        if (!existsSync(commandsDir)) {
          await mkdir(commandsDir, { recursive: true });
        }

        // Generate filename from workflow name
        const fileName = workflow.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
        const filePath = path.join(commandsDir, `${fileName}.md`);

        // Write markdown content
        await writeFile(filePath, mdContent, 'utf-8');

        logger.info(`[Workflow] Exported to project: ${filePath}`);
        return { success: true, data: { filePath } };
      } catch (error) {
        logger.error('[Workflow] Failed to export to project:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export workflow to project'
        };
      }
    }
  );

  // ============================================
  // Workflow Execution Operations
  // ============================================

  // In-memory execution records (for production, use a database)
  const executionRecords = new Map<string, ExecutionRecord>();

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_EXECUTE,
    async (_, workflow: Workflow, config: ExecutionConfig): Promise<IPCResult<string>> => {
      try {
        // Use workflow object directly instead of loading from file
        if (!workflow || !workflow.id) {
          return { success: false, error: 'Invalid workflow' };
        }

        const workflowId = workflow.id;

        // Create execution record
        const executionId = uuidv4();
        const executionRecord: ExecutionRecord = {
          id: executionId,
          workflowId,
          status: 'pending',
          startedAt: new Date().toISOString(),
          config,
          logs: [],  // Initialize logs array
        };
        executionRecords.set(executionId, executionRecord);

        // Execute workflow on Python backend
        executionRecord.status = 'running';

        const mainWindow = BrowserWindow.getAllWindows()[0];

        // 获取 Auto-Claude 项目的实际路径
        // 在开发模式下使用 process.cwd()，在生产模式下使用 app.getAppPath()
        const { app } = await import('electron');
        const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
        const projectPath = isDev
          ? path.resolve(__dirname, '..', '..', '..', '..', '..')  // 开发模式：从 out/main 回溯到项目根目录
          : path.dirname(app.getAppPath());  // 生产模式

        try {
          // Import executeWorkflowOnBackend
          const { executeWorkflowOnBackend } = await import('./execution');

          const resultExecutionId = await executeWorkflowOnBackend(
            workflow,
            config,
            projectPath,
            (progress: { progress: number; status?: string; current_node?: string }) => {
            // Log progress to execution record
            const logMessage = `[${progress.progress}%] Node: ${progress.current_node || 'unknown'} - ${progress.status || 'running'}`;
            executionRecord.logs?.push(`[${new Date().toISOString()}] ${logMessage}`);

            // Send progress update to renderer
            if (mainWindow) {
              mainWindow.webContents.send(IPC_CHANNELS.WORKFLOW_EXECUTION_PROGRESS, {
                executionId,
                workflowId,
                status: 'running',
                progress: progress.progress,
                currentNode: progress.current_node,
              });
            }
          }
          );

          // Execution completed successfully
          executionRecord.status = 'completed';
          executionRecord.completedAt = new Date().toISOString();
          executionRecord.logs?.push(`[${new Date().toISOString()}] Workflow execution completed successfully`);
          
          if (mainWindow) {
            mainWindow.webContents.send(IPC_CHANNELS.WORKFLOW_EXECUTION_COMPLETE, {
              executionId,
              workflowId,
              status: 'completed',
            });
          }

          return { success: true, data: executionId };
        } catch (executionError) {
          // Execution failed
          executionRecord.status = 'failed';
          executionRecord.completedAt = new Date().toISOString();
          executionRecord.error = executionError instanceof Error ? executionError.message : 'Unknown error';
          executionRecord.logs?.push(`[${new Date().toISOString()}] Workflow execution failed: ${executionRecord.error}`);

          if (mainWindow) {
            mainWindow.webContents.send(IPC_CHANNELS.WORKFLOW_EXECUTION_ERROR, {
              executionId,
              workflowId,
              status: 'failed',
              error: executionRecord.error,
            });
          }

          throw executionError;
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to execute workflow'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_PAUSE,
    async (_, executionId: string): Promise<IPCResult<void>> => {
      try {
        const record = executionRecords.get(executionId);
        if (!record) {
          return { success: false, error: 'Execution not found' };
        }

        if (record.status !== 'running') {
          return { success: false, error: 'Execution is not running' };
        }

        record.status = 'paused';
        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to pause execution'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_RESUME,
    async (_, executionId: string): Promise<IPCResult<void>> => {
      try {
        const record = executionRecords.get(executionId);
        if (!record) {
          return { success: false, error: 'Execution not found' };
        }

        if (record.status !== 'paused') {
          return { success: false, error: 'Execution is not paused' };
        }

        record.status = 'running';
        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to resume execution'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_STOP,
    async (_, executionId: string): Promise<IPCResult<void>> => {
      try {
        // Stop workflow process
        const { stopWorkflowExecution } = await import('./workflow-executor');
        stopWorkflowExecution(executionId);

        // Also update execution record if exists
        const record = executionRecords.get(executionId);
        if (record && (record.status === 'running' || record.status === 'paused')) {
          record.status = 'cancelled';
          record.completedAt = new Date().toISOString();
        }

        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to stop execution'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_GET_EXECUTION_STATUS,
    async (_, executionId: string): Promise<IPCResult<ExecutionRecord>> => {
      try {
        const record = executionRecords.get(executionId);
        if (!record) {
          return { success: false, error: 'Execution not found' };
        }

        return { success: true, data: record };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get execution status'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_GET_EXECUTION_LOGS,
    async (_, executionId: string): Promise<IPCResult<string[]>> => {
      try {
        const record = executionRecords.get(executionId);
        if (!record) {
          return { success: false, error: 'Execution not found' };
        }

        // Return logs from execution record
        const logs = record.logs || [];
        return { success: true, data: logs };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get execution logs'
        };
      }
    }
  );

  // ============================================
  // Streaming Workflow Execution (Claude SDK)
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_EXECUTE_STREAM,
    async (_, workflow: Workflow): Promise<IPCResult<void>> => {
      try {
        // Validate workflow
        if (!workflow || !workflow.id) {
          return { success: false, error: 'Invalid workflow' };
        }

        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (!mainWindow) {
          return { success: false, error: 'No main window found' };
        }

        // Import stream executor
        const { executeWorkflowStream, validateWorkflowForExecution } = await import('./stream-executor');

        // Validate workflow before execution
        const validation = validateWorkflowForExecution(workflow);
        if (!validation.valid) {
          return { success: false, error: validation.errors.join('; ') };
        }

        // Execute workflow with streaming
        await executeWorkflowStream(workflow, {
          onChunk: (chunk) => {
            mainWindow.webContents.send(IPC_CHANNELS.WORKFLOW_STREAM_CHUNK, chunk);
          },
          onProgress: (progress) => {
            mainWindow.webContents.send(IPC_CHANNELS.WORKFLOW_EXECUTION_PROGRESS, {
              executionId: workflow.id,
              workflowId: workflow.id,
              status: progress.status,
              progress: progress.progress,
              currentNode: progress.currentNode,
              message: progress.message,
            });
          },
          onComplete: () => {
            mainWindow.webContents.send(IPC_CHANNELS.WORKFLOW_STREAM_COMPLETE);
          },
          onError: (error) => {
            mainWindow.webContents.send(IPC_CHANNELS.WORKFLOW_STREAM_ERROR, error);
          },
        });

        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to execute workflow stream'
        };
      }
    }
  );

  // ============================================
  // Workflow Command Execution (Claude CLI - Persistent Terminal)
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_EXECUTE_COMMAND,
    async (_, commandName: string, projectPath: string): Promise<IPCResult<string>> => {
      try {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (!mainWindow) {
          return { success: false, error: 'No main window found' };
        }

        if (!commandName || !projectPath) {
          return { success: false, error: 'Command name and project path are required' };
        }

        // Import workflow executor
        const { executeWorkflowCommand, runningWorkflowProcesses } = await import('./workflow-executor');

        const executionId = `workflow-${Date.now()}`;

        logger.info('[WorkflowHandler] Starting command execution:', { executionId, commandName, projectPath });

        const childProcess = await executeWorkflowCommand(commandName, projectPath, {
          onOutput: (data) => {
            mainWindow.webContents.send(IPC_CHANNELS.WORKFLOW_COMMAND_OUTPUT, executionId, data);
          },
          onComplete: () => {
            logger.info('[WorkflowHandler] Command execution completed:', executionId);
            mainWindow.webContents.send(IPC_CHANNELS.WORKFLOW_COMMAND_COMPLETE, executionId);
            runningWorkflowProcesses.delete(executionId);
          },
          onError: (error) => {
            logger.error('[WorkflowHandler] Command execution error:', { executionId, error });
            mainWindow.webContents.send(IPC_CHANNELS.WORKFLOW_COMMAND_ERROR, executionId, error);
            runningWorkflowProcesses.delete(executionId);
          },
        });

        runningWorkflowProcesses.set(executionId, childProcess);
        return { success: true, data: executionId };
      } catch (error) {
        logger.error('[WorkflowHandler] Failed to execute command:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to execute command'
        };
      }
    }
  );

  // ============================================
  // Unified MCP Session Management
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_INIT_SESSION,
    async (_, projectPath: string): Promise<IPCResult<void>> => {
      try {
        const { unifiedMcpSession } = await import('./unified-mcp-session');
        await unifiedMcpSession.initialize(projectPath);

        logger.info('[WorkflowHandler] Unified MCP session initialized for:', projectPath);
        return { success: true, data: undefined };
      } catch (error) {
        logger.error('[WorkflowHandler] Failed to initialize unified session:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to initialize session'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_GET_SESSION_STATUS,
    async (): Promise<IPCResult<{
      active: boolean;
      ready: boolean;
      busy: boolean;
      projectPath: string | null;
    }>> => {
      try {
        const { unifiedMcpSession } = await import('./unified-mcp-session');
        const status = unifiedMcpSession.getStatus();
        return { success: true, data: status };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get session status'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_CLOSE_SESSION,
    async (): Promise<IPCResult<void>> => {
      try {
        const { unifiedMcpSession } = await import('./unified-mcp-session');
        await unifiedMcpSession.shutdown();

        logger.info('[WorkflowHandler] Unified MCP session closed');
        return { success: true, data: undefined };
      } catch (error) {
        logger.error('[WorkflowHandler] Failed to close unified session:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to close session'
        };
      }
    }
  );

  // ============================================
  // Node Validation
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.NODE_VALIDATE,
    async (_, nodeType: string, nodeData: unknown): Promise<IPCResult<{ valid: boolean; errors: string[] }>> => {
      try {
        // TODO: Implement node validation logic
        // For now, return valid
        return {
          success: true,
          data: { valid: true, errors: [] }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to validate node'
        };
      }
    }
  );

  // ============================================
  // Template Operations
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_LIST,
    async (): Promise<IPCResult<WorkflowTemplate[]>> => {
      try {
        const files = await readdir(TEMPLATES_DIR);
        const templates: WorkflowTemplate[] = [];

        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(TEMPLATES_DIR, file);
            const content = await readFile(filePath, 'utf-8');
            const template = JSON.parse(content) as WorkflowTemplate;
            templates.push(template);
          }
        }

        return { success: true, data: templates };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list templates'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_APPLY,
    async (_, templateId: string): Promise<IPCResult<Workflow>> => {
      try {
        const filePath = path.join(TEMPLATES_DIR, `${templateId}.json`);

        if (!existsSync(filePath)) {
          return { success: false, error: 'Template not found' };
        }

        const content = await readFile(filePath, 'utf-8');
        const template = JSON.parse(content) as WorkflowTemplate;

        // Create workflow from template
        const id = uuidv4();
        const now = new Date().toISOString();

        const workflow: Workflow = {
          ...template.workflow,
          id,
          name: `${template.workflow.name} (from template)`,
          createdAt: now,
          updatedAt: now,
        };

        // Save to file
        const workflowFilePath = path.join(WORKSPACE_DIR, `${id}.json`);
        await writeFile(workflowFilePath, JSON.stringify(workflow, null, 2), 'utf-8');

        return { success: true, data: workflow };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to apply template'
        };
      }
    }
  );

  // ============================================
  // Agent Operations (for SubAgent node)
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.AGENT_LIST_FROM_PROJECT,
    async (_, projectPath: string): Promise<IPCResult<Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      icon?: string;
      filePath: string;
    }>>> => {
      try {
        // Validate project path
        if (!projectPath || !existsSync(projectPath)) {
          return { success: false, error: 'Invalid project path' };
        }

        const agentsDir = path.join(projectPath, '.claude', 'agents');

        // If directory doesn't exist, return empty list
        if (!existsSync(agentsDir)) {
          return { success: true, data: [] };
        }

        const files = await readdir(agentsDir);
        const agents: Array<{
          id: string;
          name: string;
          description: string;
          category: string;
          icon?: string;
          filePath: string;
        }> = [];

        for (const file of files) {
          if (file.endsWith('.md') && file !== 'INDEX.md') {
            try {
              const filePath = path.join(agentsDir, file);
              const content = await readFile(filePath, 'utf-8');

              // Parse frontmatter (YAML between --- markers)
              const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
              if (frontmatterMatch) {
                const frontmatter = frontmatterMatch[1];

                // Simple YAML parsing for key fields
                const getName = (yaml: string) => {
                  const match = yaml.match(/^name:\s*(.+)$/m);
                  return match ? match[1].trim().replace(/^["']|["']$/g, '') : file.replace('.md', '');
                };
                const getDescription = (yaml: string) => {
                  const match = yaml.match(/^description:\s*["']?(.+?)["']?\s*$/m);
                  return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
                };
                const getCategory = (yaml: string) => {
                  const match = yaml.match(/^category:\s*(.+)$/m);
                  return match ? match[1].trim() : 'general';
                };
                const getIcon = (yaml: string) => {
                  const match = yaml.match(/^icon:\s*(.+)$/m);
                  return match ? match[1].trim() : undefined;
                };

                agents.push({
                  id: file.replace('.md', ''),
                  name: getName(frontmatter),
                  description: getDescription(frontmatter),
                  category: getCategory(frontmatter),
                  icon: getIcon(frontmatter),
                  filePath,
                });
              } else {
                // No frontmatter, use filename as name
                agents.push({
                  id: file.replace('.md', ''),
                  name: file.replace('.md', ''),
                  description: '',
                  category: 'general',
                  filePath,
                });
              }
            } catch (parseError) {
              logger.warn(`[Agent] Failed to parse ${file}:`, parseError);
            }
          }
        }

        // Sort by category then name
        agents.sort((a, b) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.name.localeCompare(b.name);
        });

        logger.info(`[Agent] Listed ${agents.length} agents from project: ${projectPath}`);
        return { success: true, data: agents };
      } catch (error) {
        logger.error('[Agent] Failed to list agents from project:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list agents from project'
        };
      }
    }
  );

  // ============================================
  // Command Operations (for Command node)
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.COMMAND_LIST_FROM_PROJECT,
    async (_, projectPath: string): Promise<IPCResult<Array<{
      name: string;
      description: string;
      commandPath: string;
      validationStatus: 'valid' | 'missing' | 'invalid';
    }>>> => {
      try {
        // Validate project path
        if (!projectPath || !existsSync(projectPath)) {
          return { success: false, error: 'Invalid project path' };
        }

        const commandsDir = path.join(projectPath, '.claude', 'commands');

        // If directory doesn't exist, return empty list
        if (!existsSync(commandsDir)) {
          return { success: true, data: [] };
        }

        const files = await readdir(commandsDir);
        const commands: Array<{
          name: string;
          description: string;
          commandPath: string;
          validationStatus: 'valid' | 'missing' | 'invalid';
        }> = [];

        for (const file of files) {
          if (file.endsWith('.md')) {
            try {
              const filePath = path.join(commandsDir, file);
              const content = await readFile(filePath, 'utf-8');

              // Extract description from first line or frontmatter
              let description = '';
              const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
              if (frontmatterMatch) {
                const descMatch = frontmatterMatch[1].match(/^description:\s*["']?(.+?)["']?\s*$/m);
                if (descMatch) {
                  description = descMatch[1].trim();
                }
              }

              // If no frontmatter description, use first non-empty line after frontmatter
              if (!description) {
                const contentAfterFrontmatter = frontmatterMatch
                  ? content.slice(frontmatterMatch[0].length).trim()
                  : content.trim();
                const firstLine = contentAfterFrontmatter.split('\n')[0];
                if (firstLine && !firstLine.startsWith('#')) {
                  description = firstLine.slice(0, 100);
                }
              }

              commands.push({
                name: file.replace('.md', ''),
                description,
                commandPath: filePath,
                validationStatus: 'valid',
              });
            } catch (parseError) {
              logger.warn(`[Command] Failed to parse ${file}:`, parseError);
              commands.push({
                name: file.replace('.md', ''),
                description: '',
                commandPath: path.join(commandsDir, file),
                validationStatus: 'invalid',
              });
            }
          }
        }

        // Sort by name
        commands.sort((a, b) => a.name.localeCompare(b.name));

        logger.info(`[Command] Listed ${commands.length} commands from project: ${projectPath}`);
        return { success: true, data: commands };
      } catch (error) {
        logger.error('[Command] Failed to list commands from project:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list commands from project'
        };
      }
    }
  );
}
