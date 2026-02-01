/**
 * Workflow Executor
 *
 * Executes workflow slash commands using the unified MCP session.
 * Uses --input-format=stream-json --output-format=stream-json for bidirectional communication.
 */

import { ChildProcess } from 'child_process';
import { logger } from '../../lib/logger';

/**
 * Callbacks for workflow execution events
 */
export interface WorkflowExecutionCallbacks {
  /** Called when output is received from the process */
  onOutput: (data: string) => void;
  /** Called when execution completes successfully */
  onComplete: () => void;
  /** Called when an error occurs */
  onError: (error: string) => void;
}

/**
 * Store for running workflow processes (for external tracking)
 */
export const runningWorkflowProcesses = new Map<string, ChildProcess>();

/**
 * Execute a workflow slash command using unified MCP session
 *
 * @param commandName - The name of the slash command (without leading /)
 * @param projectPath - The project directory to execute in
 * @param callbacks - Callbacks for execution events
 * @returns The child process
 */
export async function executeWorkflowCommand(
  commandName: string,
  projectPath: string,
  callbacks: WorkflowExecutionCallbacks
): Promise<ChildProcess> {
  logger.info('[WorkflowExecutor] Starting execution:', { commandName, projectPath });

  // 使用统一会话
  const { unifiedMcpSession } = await import('./unified-mcp-session');
  const status = unifiedMcpSession.getStatus();

  // 如果统一会话未就绪，先初始化
  if (!status.active || !status.ready) {
    logger.info('[WorkflowExecutor] Unified session not ready, initializing...');
    try {
      await unifiedMcpSession.initialize(projectPath);
    } catch (error) {
      logger.error('[WorkflowExecutor] Failed to initialize unified session:', error);
      callbacks.onError(`Failed to initialize session: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  logger.info('[WorkflowExecutor] Using unified MCP session');
  const process = await unifiedMcpSession.executeCommand(commandName, callbacks);

  // Track the process for potential stopping
  const executionId = `${commandName}-${Date.now()}`;
  runningWorkflowProcesses.set(executionId, process);

  return process;
}

/**
 * Stop a running workflow execution
 */
export function stopWorkflowExecution(executionId: string): boolean {
  const process = runningWorkflowProcesses.get(executionId);
  if (process) {
    logger.info('[WorkflowExecutor] Stopping execution:', executionId);
    process.kill();
    runningWorkflowProcesses.delete(executionId);
    return true;
  }
  return false;
}

/**
 * Clear all running workflow processes
 */
export function clearAllWorkflowProcesses(): void {
  logger.info('[WorkflowExecutor] Clearing all workflow processes');
  for (const [id, process] of runningWorkflowProcesses) {
    process.kill();
  }
  runningWorkflowProcesses.clear();
}
