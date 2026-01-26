/**
 * AI Generation and Optimization IPC Handler
 * ============================================
 *
 * Handles AI-powered workflow generation and optimization requests.
 */

import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { getConfiguredPythonPath } from '../../python-env-manager';
import { IPC_CHANNELS } from '../../../shared/constants/ipc';
import { logger } from '../../lib/logger';

interface GenerationRequest {
  description: string;
  context?: string;
  projectPath: string;
}

interface OptimizationRequest {
  workflow: any;
  optimizationRequest: string;
  conversationHistory?: any[];
  projectPath: string;
}

interface SkillGenerationRequest {
  description: string;
  skillName: string;
  context?: string;
  projectPath: string;
  overwrite?: boolean;
}

/**
 * Execute Python AI function via subprocess.
 */
async function executePythonAI(
  functionName: string,
  args: any,
  projectPath: string,
  timeout: number = 300000
): Promise<any> {
  const pythonPath = await getConfiguredPythonPath();

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(pythonPath, [
      '-c',
      `
import sys
import asyncio
import json
from pathlib import Path

sys.path.insert(0, '${path.join(projectPath, 'apps', 'backend')}')

from workflow.ai_generator import generate_workflow_from_description
from workflow.ai_optimizer import optimize_workflow, analyze_workflow, suggest_optimizations
from workflow.ai_skill_generator import generate_and_save_skill

async def main():
    try:
        input_data = json.loads(sys.stdin.read())
        function_name = input_data['function']
        args = input_data['args']

        if function_name == 'generate':
            result = await generate_workflow_from_description(
                description=args['description'],
                context=args.get('context', ''),
                project_dir=Path('${projectPath}'),
                spec_dir=Path('${projectPath}').joinpath('.auto-claude', 'spec'),
            )
        elif function_name == 'optimize':
            result = await optimize_workflow(
                workflow=args['workflow'],
                optimization_request=args['optimizationRequest'],
                conversation_history=args.get('conversationHistory', []),
                project_dir=Path('${projectPath}'),
                spec_dir=Path('${projectPath}').joinpath('.auto-claude', 'spec'),
            )
        elif function_name == 'analyze':
            result = await analyze_workflow(
                workflow=args['workflow'],
                project_dir=Path('${projectPath}'),
                spec_dir=Path('${projectPath}').joinpath('.auto-claude', 'spec'),
            )
        elif function_name == 'suggest':
            result = await suggest_optimizations(
                workflow=args['workflow'],
                focus_area=args.get('focusArea'),
                project_dir=Path('${projectPath}'),
                spec_dir=Path('${projectPath}').joinpath('.auto-claude', 'spec'),
            )
        elif function_name == 'generate_skill':
            result = await generate_and_save_skill(
                description=args['description'],
                skill_name=args['skillName'],
                context=args.get('context', ''),
                project_dir=Path('${projectPath}'),
                spec_dir=Path('${projectPath}').joinpath('.auto-claude', 'spec'),
                overwrite=args.get('overwrite', False),
            )
        else:
            raise ValueError(f"Unknown function: {function_name}")

        sys.stdout.write(json.dumps(result) + "\\n")
        sys.stdout.flush()

    except Exception as e:
        sys.stderr.write(json.dumps({
            "success": False,
            "error": str(e)
        }) + "\\n")
        sys.stderr.flush()
        sys.exit(1)

asyncio.run(main())
`
    ], {
      cwd: projectPath,
      env: {
        ...process.env,
        PYTHONPATH: path.join(projectPath, 'apps', 'backend')
      }
    });

    let outputBuffer = '';
    let errorBuffer = '';

    pythonProcess.stdout?.on('data', (data) => {
      outputBuffer += data.toString();
    });

    pythonProcess.stderr?.on('data', (data) => {
      errorBuffer += data.toString();
      logger.error(`[AI-${functionName}] Python error:`, data.toString());
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(outputBuffer.trim());
          resolve(result);
        } catch (error) {
          reject(new Error('Failed toAI result'));
        }
      } else {
        try {
          const error = JSON.parse(errorBuffer.trim());
          resolve(error);
        } catch (e) {
          reject(new Error(errorBuffer || `Process exited with code ${code}`));
        }
      }
    });

    // Send input
    pythonProcess.stdin?.write(JSON.stringify({
      function: functionName,
      args
    }));
    pythonProcess.stdin?.end();

    // Timeout
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error(`AI ${functionName} timeout`));
    }, timeout);
  });
}

/**
 * Register AI generation  optimization IPC handlers.
 */
export function registerAIGenerationHandlers() {
  /**
   * Generate workflow from natural language description.
   */
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_AI_GENERATE,
    async (event, request: GenerationRequest) => {
      try {
        logger.info('[AIGeneration] Starting workflow generation');

        const result = await executePythonAI('generate', {
          description: request.description,
          context: request.context || '',
        }, request.projectPath);

        logger.info('[AIGeneration] Generation complete:', result.success);
        return result;
      } catch (error) {
        logger.error('[AIGeneration] Failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  /**
   * Optimize existing workflow.
   */
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_AI_OPTIMIZE,
    async (event, request: OptimizationRequest) => {
      try {
        logger.info('[AIOptimization] Starting workflow optimization');

        const result = await executePythonAI('optimize', {
          workflow: request.workflow,
          optimizationRequest: request.optimizationRequest,
          conversationHistory: request.conversationHistory || [],
        }, request.projectPath);

        logger.info('[AIOptimization] Optimization complete:', result.success);
        return result;
      } catch (error) {
        logger.error('[AIOptimization] Failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  /**
   * Analyze workflow.
   */
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_AI_ANALYZE,
    async (event, { workflow, projectPath }: { workflow: any; projectPath: string }) => {
      try {
        logger.info('[AIAnalysis] Starting workflow analysis');

        const result = await executePythonAI('analyze', {
          workflow
        }, projectPath);

        logger.info('[AIAnalysis] Analysis complete:', result.success);
        return result;
      } catch (error) {
        logger.error('[AIAnalysis] Failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  /**
   * Get optimization suggestions.
   */
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_AI_SUGGEST,
    async (event, { workflow, focusArea, projectPath }: { workflow: any; focusArea?: string; projectPath: string }) => {
      try {
        logger.info('[AISuggestions] Getting optimization suggestions');

        const result = await executePythonAI('suggest', {
          workflow,
          focusArea
        }, projectPath);

        logger.info('[AISuggestions] Suggestions complete:', result.success);
        return result;
      } catch (error) {
        logger.error('[AISuggestions] Failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  /**
   * Generate Claude skill from description.
   */
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_AI_GENERATE_SKILL,
    async (event, request: SkillGenerationRequest) => {
      try {
        logger.info('[AISkillGeneration] Starting skill generation:', request.skillName);

        const result = await executePythonAI('generate_skill', {
          description: request.description,
          skillName: request.skillName,
          context: request.context || '',
          overwrite: request.overwrite || false,
        }, request.projectPath);

        logger.info('[AISkillGeneration] Generation complete:', result.success);
        return result;
      } catch (error) {
        logger.error('[AISkillGeneration] Failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  /**
   * Generate workflow name from nodes and connections.
   */
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_GENERATE_NAME,
    async (event, { nodes, connections }: { nodes: any[]; connections: any[] }) => {
      try {
        logger.info('[AINameGeneration] Generating workflow name');

        // Simple name generation based on node types
        // For production, this could call AI to generate a more descriptive name
        const nodeTypes = nodes.map(n => n.type).filter(t => t !== 'start' && t !== 'end');
        const uniqueTypes = [...new Set(nodeTypes)];

        let name = 'Workflow';
        if (uniqueTypes.length > 0) {
          const typeNames = uniqueTypes.map(t => {
            switch (t) {
              case 'prompt': return 'Prompt';
              case 'skill': return 'Skill';
              case 'mcp': return 'MCP';
              case 'subAgent': return 'Agent';
              case 'ifElse': return 'Conditional';
              case 'switch': return 'Switch';
              case 'askUserQuestion': return 'Interactive';
              default: return t;
            }
          });
          name = typeNames.slice(0, 3).join(' + ');
        }

        logger.info('[AINameGeneration] Generated name:', name);
        return {
          success: true,
          data: name
        };
      } catch (error) {
        logger.error('[AINameGeneration] Failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  logger.info('[AI] Handlers registered');
}
