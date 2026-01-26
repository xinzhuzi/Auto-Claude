/**
 * Workflow Executor
 *
 * Executes workflow slash commands using a persistent Claude CLI process.
 * Uses --input-format=stream-json --output-format=stream-json for bidirectional communication.
 * Supports true process reuse - one persistent process handles multiple executions.
 */

import { spawn, ChildProcess } from 'child_process';
import { getAPIProfileEnv } from '../../services/profile/profile-service';
import { getClaudeCliInvocationAsync } from '../../claude-cli-utils';
import { getOAuthModeClearVars } from '../../agent/env-utils';
import { getSpawnCommand, getSpawnOptions } from '../../env-utils';
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
 * Parse a stream-json event from Claude CLI
 */
interface StreamJsonEvent {
  type: 'system' | 'assistant' | 'user' | 'result';
  subtype?: string;
  session_id?: string;
  message?: {
    content?: Array<{ type: string; text?: string }>;
  };
  result?: string;
  error?: string;
  is_error?: boolean;
}

/**
 * Persistent process entry
 */
interface PersistentProcessEntry {
  process: ChildProcess;
  sessionId: string | null;
  outputBuffer: string;
  currentCallbacks: WorkflowExecutionCallbacks | null;
  isReady: boolean;
}

/**
 * Persistent Claude processes (keyed by projectPath)
 */
const persistentProcesses = new Map<string, PersistentProcessEntry>();

/**
 * Store for running workflow processes (for external tracking)
 */
export const runningWorkflowProcesses = new Map<string, ChildProcess>();

/**
 * Get or create a persistent Claude process for a project
 */
async function getOrCreateProcess(projectPath: string): Promise<PersistentProcessEntry> {
  const existing = persistentProcesses.get(projectPath);
  if (existing?.process && !existing.process.killed) {
    logger.info('[WorkflowExecutor] Reusing persistent process for:', projectPath);
    return existing;
  }

  logger.info('[WorkflowExecutor] Creating new persistent process for:', projectPath);

  // 1. Get Claude CLI path and environment
  const { command: claudeCmd, env: claudeEnv } = await getClaudeCliInvocationAsync();
  logger.info('[WorkflowExecutor] Claude CLI:', claudeCmd);

  // 2. Get authentication environment variables
  let apiProfileEnv: Record<string, string> = {};
  try {
    apiProfileEnv = await getAPIProfileEnv();
    logger.info('[WorkflowExecutor] Got API profile env');
  } catch (error) {
    logger.error('[WorkflowExecutor] Failed to get API profile env:', error);
  }

  // 3. Get OAuth mode clearing vars
  const oauthModeClearVars = getOAuthModeClearVars(apiProfileEnv);

  // 4. Build environment variables - remove conflicting auth vars
  const {
    DEBUG: _DEBUG,
    ANTHROPIC_API_KEY: _ANTHROPIC_API_KEY,
    ANTHROPIC_AUTH_TOKEN: _ANTHROPIC_AUTH_TOKEN,
    ...cleanEnv
  } = process.env;

  const env = {
    ...cleanEnv,
    ...claudeEnv,
    ...oauthModeClearVars,
    ...apiProfileEnv,
  };

  // Ensure no auth conflict
  if (apiProfileEnv.ANTHROPIC_AUTH_TOKEN) {
    delete (env as Record<string, string | undefined>).ANTHROPIC_API_KEY;
  }

  // 5. Build command arguments for persistent process
  const args: string[] = [
    '--input-format=stream-json',
    '--output-format=stream-json',
    '--verbose',
  ];

  logger.info('[WorkflowExecutor] Args:', args);

  // 6. Spawn the persistent process
  const spawnCmd = getSpawnCommand(claudeCmd);
  const spawnOpts = getSpawnOptions(claudeCmd, {
    cwd: projectPath,
    env: env as Record<string, string>,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const childProcess = spawn(spawnCmd, args, spawnOpts);
  logger.info('[WorkflowExecutor] Persistent process spawned, PID:', childProcess.pid);

  // Create entry
  const entry: PersistentProcessEntry = {
    process: childProcess,
    sessionId: null,
    outputBuffer: '',
    currentCallbacks: null,
    isReady: false,
  };

  persistentProcesses.set(projectPath, entry);

  // 7. Set up stdout handler
  if (childProcess.stdout) {
    childProcess.stdout.on('data', (data: Buffer) => {
      entry.outputBuffer += data.toString();

      // Parse complete JSON lines
      const lines = entry.outputBuffer.split('\n');
      entry.outputBuffer = lines.pop() || '';  // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const event = JSON.parse(line) as StreamJsonEvent;
          handleStreamEvent(event, projectPath, entry);
        } catch (e) {
          // Log parse errors but don't fail
          logger.warn('[WorkflowExecutor] Failed to parse JSON line:', line.substring(0, 100));
        }
      }
    });
  }

  // 8. Set up stderr handler
  if (childProcess.stderr) {
    childProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      logger.warn('[WorkflowExecutor] stderr:', text);
    });
  }

  // 9. Handle process close
  childProcess.on('close', (code: number | null) => {
    logger.info('[WorkflowExecutor] Persistent process closed with code:', code);

    // Notify current callbacks if any
    if (entry.currentCallbacks) {
      if (code !== 0) {
        entry.currentCallbacks.onError(`Process exited with code ${code}`);
      }
      entry.currentCallbacks = null;
    }

    // Remove from cache
    persistentProcesses.delete(projectPath);
  });

  // 10. Handle process error
  childProcess.on('error', (error: Error) => {
    logger.error('[WorkflowExecutor] Persistent process error:', error);

    if (entry.currentCallbacks) {
      entry.currentCallbacks.onError(error.message);
      entry.currentCallbacks = null;
    }

    persistentProcesses.delete(projectPath);
  });

  return entry;
}

/**
 * Handle a stream-json event from Claude CLI
 */
function handleStreamEvent(
  event: StreamJsonEvent,
  projectPath: string,
  entry: PersistentProcessEntry
): void {
  const callbacks = entry.currentCallbacks;

  switch (event.type) {
    case 'system':
      // Cache session_id
      if (event.session_id) {
        entry.sessionId = event.session_id;
        logger.info('[WorkflowExecutor] Session ID:', event.session_id);
      }
      // Mark as ready after first system event
      entry.isReady = true;
      break;

    case 'assistant':
      // Extract text content from assistant message
      if (callbacks && event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'text' && block.text) {
            callbacks.onOutput(block.text);
          }
        }
      }
      break;

    case 'result':
      // Execution completed
      if (callbacks) {
        if (event.is_error || event.subtype === 'error') {
          callbacks.onError(event.error || event.result || 'Execution failed');
        } else {
          callbacks.onComplete();
        }
        // Clear current callbacks after result
        entry.currentCallbacks = null;
      }
      break;

    case 'user':
      // User messages (echoed back) - ignore
      break;

    default:
      logger.info('[WorkflowExecutor] Unknown event type:', event.type);
  }
}

/**
 * Execute a workflow slash command using persistent Claude CLI process
 *
 * @param commandName - The name of the slash command (without leading /)
 * @param projectPath - The project directory to execute in
 * @param callbacks - Callbacks for execution events
 * @returns The persistent child process
 */
export async function executeWorkflowCommand(
  commandName: string,
  projectPath: string,
  callbacks: WorkflowExecutionCallbacks
): Promise<ChildProcess> {
  logger.info('[WorkflowExecutor] Starting execution:', { commandName, projectPath });

  // Get or create persistent process
  const entry = await getOrCreateProcess(projectPath);

  // Check if process is busy (prevent race condition)
  if (entry.currentCallbacks !== null) {
    logger.warn('[WorkflowExecutor] Process is busy, rejecting new execution');
    callbacks.onError('Process is busy with another execution. Please wait for it to complete.');
    return entry.process;
  }

  // Set current callbacks
  entry.currentCallbacks = callbacks;

  // Build JSON message
  const message = JSON.stringify({
    type: 'user',
    message: {
      role: 'user',
      content: `/${commandName}`
    }
  });

  logger.info('[WorkflowExecutor] Sending message:', message);

  // Send message to stdin
  if (entry.process.stdin && !entry.process.stdin.destroyed) {
    entry.process.stdin.write(message + '\n');
  } else {
    entry.currentCallbacks = null;  // Clear callbacks on error
    callbacks.onError('Process stdin is not available');
  }

  return entry.process;
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
 * Clear session cache for a project or all projects
 * Called when profile changes or app closes
 */
export function clearSessionCache(projectPath?: string): void {
  if (projectPath) {
    const entry = persistentProcesses.get(projectPath);
    if (entry) {
      logger.info('[WorkflowExecutor] Killing persistent process for:', projectPath);
      entry.process.kill();
      persistentProcesses.delete(projectPath);
    }
  } else {
    logger.info('[WorkflowExecutor] Killing all persistent processes');
    for (const [path, entry] of persistentProcesses) {
      entry.process.kill();
    }
    persistentProcesses.clear();
  }
}

/**
 * Shutdown - kill all persistent processes
 * Called when Auto-Claude is closing or when profile changes
 */
export function shutdownPersistentSession(): void {
  clearSessionCache();
}

/**
 * Check if there's an active persistent process
 */
export function hasActiveSession(): boolean {
  return persistentProcesses.size > 0;
}

/**
 * Get the current session status
 */
export function getSessionStatus(): { active: boolean; busy: boolean; projectPath: string | null } {
  const entries = Array.from(persistentProcesses.entries());
  const busyEntry = entries.find(([_, e]) => e.currentCallbacks !== null);

  return {
    active: entries.length > 0,
    busy: busyEntry !== undefined,
    projectPath: entries[0]?.[0] || null,
  };
}
