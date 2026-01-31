/**
 * Workflow Execution Bridge
 * ==========================
 *
 * Bridges TypeScript frontend to Python workflow execution engine.
 * Spawns Python process and handles communication.
 */

import { spawn } from 'child_process';
import path from 'path';
import { getConfiguredPythonPath } from '../../python-env-manager';
import { logger } from '../../lib/logger';
import type { Workflow } from '../../../shared/types/workflow';

interface ExecutionConfig {
  projectPath: string;
  timeout?: number;
}

/**
 * Execute a workflow on Python backend.
 *
 * Spawns a Python process that runs the workflow executor module.
 * The Python process handles actual node execution and orchestrates
 * calls to Claude SDK, MCP tools, etc.
 *
 * @param workflow - Workflow definition from frontend
 * @param config - Execution configuration
 * @param projectDir - Project root directory
 * @param onProgress - Callback for progress updates
 * @returns Promise that resolves with execution ID
 */
export async function executeWorkflowOnBackend(
  workflow: Workflow,
  config: ExecutionConfig,
  projectDir: string,
  onProgress?: (progress: { executionId: string; status: string; progress: number }) => void
): Promise<string> {
  // Get Python path from environment manager
  const pythonPath = await getConfiguredPythonPath();

  // Path to workflow executor script
  const executorScript = path.join(
    projectDir,
    'apps',
    'backend',
    '-m',
    'workflow.executor'
  );

  return new Promise((resolve, reject) => {
    // Spawn Python process
    const pythonProcess = spawn(pythonPath, [
      '-c',
      `
import sys
import asyncio
import json
from pathlib import Path

sys.path.insert(0, '${path.join(projectDir, 'apps', 'backend')}')

from workflow.executor import WorkflowExecutor

async def main():
    try:
        # Load workflow from stdin
        workflow_data = json.loads(sys.stdin.read())
        config = workflow_data.get('config', {})
        workflow = workflow_data.get('workflow', {})

        # Create executor
        executor = WorkflowExecutor(
            project_dir=Path('${projectDir}'),
            spec_dir=Path('${projectDir}').joinpath('.auto-claude', 'spec')
        )

        # Define progress callback
        def progress_callback(progress):
            # Emit progress to stdout
            sys.stdout.write(json.dumps({"type": "progress", "data": progress}) + "\\n")
            sys.stdout.flush()

        # Execute workflow
        execution_id = await executor.execute_workflow(
            workflow=workflow,
            config=config,
            progress_callback=progress_callback
        )

        # Emit completion
        sys.stdout.write(json.dumps({
            "type": "complete",
            "data": {"execution_id": execution_id}
        }) + "\\n")
        sys.stdout.flush()

    except Exception as e:
        # Emit error
        sys.stderr.write(json.dumps({
            "type": "error",
            "data": {"error": str(e)}
        }) + "\\n")
        sys.stderr.flush()
        sys.exit(1)

asyncio.run(main())
`
    ], {
      cwd: projectDir,
      env: {
        ...process.env,
        PYTHONPATH: path.join(projectDir, 'apps', 'backend')
      }
    });

    let executionId: string = '';
    let outputBuffer = '';

    // Collect execution ID from output
    pythonProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      outputBuffer += output;

      // Process line by line
      const lines = outputBuffer.split('\n');
      outputBuffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const message = JSON.parse(line);

          if (message.type === 'progress') {
            // Progress update
            onProgress?.(message.data);
          } else if (message.type === 'complete') {
            // Execution completed
            executionId = message.data.execution_id;
            resolve(executionId);
          }
        } catch (error) {
          logger.error('[WorkflowExecution] Failed to parse output:', line);
        }
      }
    });

    // Handle errors
    pythonProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      logger.error('[WorkflowExecution] Python error:', error);

      try {
        const message = JSON.parse(error);
        if (message.type === 'error') {
          reject(new Error(message.data.error));
        }
      } catch (e) {
        reject(new Error(error));
      }
    });

    // Handle process exit
    pythonProcess.on('close', (code) => {
      if (code !== 0 && !executionId) {
        reject(new Error(`Python process exited with code ${code}`));
      }
    });

    // Set timeout
    setTimeout(() => {
      if (!executionId) {
        pythonProcess.kill();
        reject(new Error('Workflow execution timeout'));
      }
    }, 300000); // 5 minutes
  });
}
