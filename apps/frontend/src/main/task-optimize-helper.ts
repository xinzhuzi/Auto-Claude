/**
 * Task Optimize Helper
 * ====================
 *
 * 提供任务描述优化和 worktree 推荐功能的 Electron main 进程 helper。
 *
 * 通过调用后端 Python API 实现 AI 优化。
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import { spawn } from 'child_process';
import { app } from 'electron';
import { parsePythonCommand } from './python-detector';
import { getPathDelimiter } from './platform';
import { getConfiguredPythonPath, pythonEnvManager } from './python-env-manager';
import { getAPIProfileEnv } from './services/profile';
import { getBestAvailableProfileEnv } from './rate-limit-detector';
import { getOAuthModeClearVars } from './agent/env-utils';
import type { IPCResult } from '../shared/types';
import type {
  OptimizeTaskRequest,
  OptimizeTaskResponse
} from '../shared/types/task-optimize';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Debug logging
 */
const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';

function debug(...args: unknown[]): void {
  if (DEBUG) {
    console.warn('[TaskOptimizeHelper]', ...args);
  }
}

/**
 * Get the auto-claude source path
 */
function getAutoBuildSourcePath(): string | null {
  const possiblePaths = [
    // Apps structure: from out/main -> apps/backend
    path.resolve(__dirname, '..', '..', '..', 'backend'),
    path.resolve(app.getAppPath(), '..', 'backend'),
    path.resolve(process.cwd(), 'apps', 'backend')
  ];

  for (const p of possiblePaths) {
    if (existsSync(p) && existsSync(path.join(p, 'api', 'task_optimize_helper.py'))) {
      return p;
    }
  }
  return null;
}

/**
 * Load environment variables from auto-claude .env file
 */
function loadAutoBuildEnv(): Record<string, string> {
  const autoBuildSource = getAutoBuildSourcePath();
  if (!autoBuildSource) return {};

  const envPath = path.join(autoBuildSource, '.env');
  if (!existsSync(envPath)) return {};

  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars: Record<string, string> = {};

    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        let value = trimmed.substring(eqIndex + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        envVars[key] = value;
      }
    }

    return envVars;
  } catch {
    return {};
  }
}

/**
 * Create the Python script to optimize task description
 */
function createOptimizeScript(request: OptimizeTaskRequest): string {
  // Double JSON.stringify ensures proper escaping for Python string literal
  const escapedRequest = JSON.stringify(JSON.stringify(request));

  return `
import asyncio
import sys
import json

async def optimize_task():
    try:
        from api.task_optimize_helper import optimize_task_description, OptimizeTaskRequest

        request_data = json.loads(${escapedRequest})
        request = OptimizeTaskRequest(**request_data)

        response = await optimize_task_description(request)

        # Output JSON result
        result = {
            "optimized_description": response.optimized_description,
            "worktree_recommendation": {
                "use_worktree": response.worktree_recommendation.use_worktree,
                "reason": response.worktree_recommendation.reason,
                "confidence": response.worktree_recommendation.confidence
            },
            "improvements": response.improvements
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)

    except ImportError as e:
        print(json.dumps({"error": f"Import error: {e}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Error: {e}"}), file=sys.stderr)
        sys.exit(1)

asyncio.run(optimize_task())
`;
}

/**
 * Optimize task description using AI
 */
export async function optimizeTaskDescription(
  request: OptimizeTaskRequest
): Promise<IPCResult<OptimizeTaskResponse>> {
  const autoBuildSource = getAutoBuildSourcePath();

  if (!autoBuildSource) {
    debug('Auto-claude source path not found');
    return {
      success: false,
      error: 'Backend not found. Please ensure the backend is properly installed.'
    };
  }

  const script = createOptimizeScript(request);
  const autoBuildEnv = loadAutoBuildEnv();

  debug('Optimizing task description:', request.task_description.substring(0, 100) + '...');

  // Get active API profile environment variables
  const apiProfileEnv = await getAPIProfileEnv();
  const isApiProfileActive = Object.keys(apiProfileEnv).length > 0;

  debug('API Profile active:', isApiProfileActive, 'apiProfileEnv:', apiProfileEnv);

  // Only get OAuth profile env if no API profile is active
  let profileEnv: Record<string, string> = {};
  if (!isApiProfileActive) {
    const profileResult = getBestAvailableProfileEnv();
    profileEnv = profileResult.env;

    if (profileResult.wasSwapped) {
      debug('Using alternative profile for task optimization:', {
        originalProfile: profileResult.originalProfile?.name,
        selectedProfile: profileResult.profileName,
        reason: profileResult.swapReason
      });
    }
  }

  // Get OAuth mode clearing vars
  const oauthModeClearVars = getOAuthModeClearVars(apiProfileEnv);

  // Get Python environment from pythonEnvManager (includes bundled site-packages)
  const pythonEnv = pythonEnvManager.getPythonEnv();

  // Build PYTHONPATH: bundled site-packages (if any) + autoBuildSource for local imports
  const pythonPathParts: string[] = [];
  if (pythonEnv.PYTHONPATH) {
    pythonPathParts.push(pythonEnv.PYTHONPATH);
  }
  if (autoBuildSource) {
    pythonPathParts.push(autoBuildSource);
  }
  const combinedPythonPath = pythonPathParts.join(getPathDelimiter());

  const pythonPath = getConfiguredPythonPath();

  return new Promise((resolve) => {
    const [pythonCommand, pythonBaseArgs] = parsePythonCommand(pythonPath);

    // Build clean env without CLAUDECODE to avoid nested session detection
    const cleanEnv: Record<string, string | undefined> = {
      ...process.env,
      ...pythonEnv,
      ...autoBuildEnv,
      ...profileEnv,
      ...apiProfileEnv,
      ...oauthModeClearVars,
      PYTHONPATH: combinedPythonPath,
      PYTHONUNBUFFERED: '1',
      PYTHONIOENCODING: 'utf-8',
      PYTHONUTF8: '1',
    };
    // Must delete, not just set empty — Claude CLI checks key existence
    delete cleanEnv.CLAUDECODE;

    const childProcess = spawn(pythonCommand, [...pythonBaseArgs, '-c', script], {
      cwd: autoBuildSource,
      env: cleanEnv,
    });

    let output = '';
    let errorOutput = '';

    const timeout = setTimeout(() => {
      console.warn('[TaskOptimizeHelper] Task optimization timed out after 120s');
      childProcess.kill();
      resolve({
        success: false,
        error: 'Task optimization timed out. Please try again.'
      });
    }, 120000); // 120 second timeout

    childProcess.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      errorOutput += data.toString();
    });

    childProcess.on('exit', (code: number | null) => {
      clearTimeout(timeout);

      if (code === 0 && output.trim()) {
        try {
          const result = JSON.parse(output.trim()) as OptimizeTaskResponse;
          debug('Task optimization successful');
          resolve({
            success: true,
            data: result
          });
        } catch (parseError) {
          console.warn('[TaskOptimizeHelper] Failed to parse response:', output);
          resolve({
            success: false,
            error: 'Failed to parse optimization result'
          });
        }
      } else {
        console.warn('[TaskOptimizeHelper] Task optimization failed', {
          code,
          errorOutput: errorOutput.substring(0, 500),
          output: output.substring(0, 200)
        });

        // Try to extract error message from stderr
        let errorMessage = 'Task optimization failed';
        try {
          const errorJson = JSON.parse(errorOutput.trim());
          if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch {
          // Use default error message
        }

        resolve({
          success: false,
          error: errorMessage
        });
      }
    });

    childProcess.on('error', (err) => {
      clearTimeout(timeout);
      console.warn('[TaskOptimizeHelper] Process error:', err.message);
      resolve({
        success: false,
        error: `Process error: ${err.message}`
      });
    });
  });
}
