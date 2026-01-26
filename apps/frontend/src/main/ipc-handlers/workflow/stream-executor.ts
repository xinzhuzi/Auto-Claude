/**
 * Workflow Stream Executor
 *
 * Executes workflows using the Anthropic SDK with streaming output.
 * Converts workflow to prompt and streams Claude's response in real-time.
 */

import Anthropic from '@anthropic-ai/sdk';
import { generateWorkflowPrompt } from './prompt-generator';
import { getAPIProfileEnv } from '../../services/profile/profile-service';
import type { Workflow } from '../../../shared/types/workflow';

/**
 * Execution progress information
 */
export interface ExecutionProgress {
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentNode?: string;
  message?: string;
}

/**
 * Stream executor options
 */
export interface StreamExecutorOptions {
  /** Callback for each text chunk received */
  onChunk: (chunk: string) => void;
  /** Callback for progress updates */
  onProgress: (progress: ExecutionProgress) => void;
  /** Callback when execution completes */
  onComplete: () => void;
  /** Callback when an error occurs */
  onError: (error: string) => void;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

/**
 * Execute a workflow using Claude SDK with streaming
 *
 * @param workflow - The workflow to execute
 * @param options - Execution options including callbacks
 * @returns Promise that resolves when execution completes
 */
export async function executeWorkflowStream(
  workflow: Workflow,
  options: StreamExecutorOptions
): Promise<void> {
  const { onChunk, onProgress, onComplete, onError, signal } = options;

  try {
    // Get API credentials from active profile
    const profileEnv = await getAPIProfileEnv();
    const apiKey = profileEnv.ANTHROPIC_AUTH_TOKEN;
    const baseUrl = profileEnv.ANTHROPIC_BASE_URL;

    if (!apiKey) {
      throw new Error('No API key configured. Please set up an API profile first.');
    }

    // Report starting
    onProgress({
      status: 'running',
      progress: 0,
      message: 'Initializing workflow execution...'
    });

    // Generate prompt from workflow
    const prompt = generateWorkflowPrompt(workflow);

    onProgress({
      status: 'running',
      progress: 10,
      message: 'Prompt generated, connecting to Claude...'
    });

    // Create Anthropic client
    const clientOptions: { apiKey: string; baseURL?: string } = { apiKey };
    if (baseUrl) {
      clientOptions.baseURL = baseUrl;
    }
    const client = new Anthropic(clientOptions);

    // Get model from profile or use default
    const model = profileEnv.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

    onProgress({
      status: 'running',
      progress: 20,
      message: `Using model: ${model}`
    });

    // Check if cancelled before starting stream
    if (signal?.aborted) {
      onProgress({
        status: 'cancelled',
        progress: 0,
        message: 'Execution cancelled'
      });
      return;
    }

    // Create streaming message
    const stream = await client.messages.stream({
      model,
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    let totalChunks = 0;

    // Process stream events
    for await (const event of stream) {
      // Check for cancellation
      if (signal?.aborted) {
        onProgress({
          status: 'cancelled',
          progress: 0,
          message: 'Execution cancelled'
        });
        return;
      }

      if (event.type === 'content_block_delta') {
        const delta = event.delta as { type: string; text?: string };
        if (delta.type === 'text_delta' && delta.text) {
          onChunk(delta.text);
          totalChunks++;

          // Update progress (estimate based on chunks received)
          const estimatedProgress = Math.min(20 + Math.floor(totalChunks / 10) * 5, 95);
          onProgress({
            status: 'running',
            progress: estimatedProgress,
            message: 'Executing workflow...'
          });
        }
      }
    }

    // Execution completed successfully
    onProgress({
      status: 'completed',
      progress: 100,
      message: 'Workflow execution completed'
    });

    onComplete();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    onProgress({
      status: 'failed',
      progress: 0,
      message: errorMessage
    });

    onError(errorMessage);
  }
}

/**
 * Validate that the workflow can be executed
 *
 * @param workflow - The workflow to validate
 * @returns Validation result with any errors
 */
export function validateWorkflowForExecution(workflow: Workflow): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!workflow) {
    errors.push('Workflow is required');
    return { valid: false, errors };
  }

  if (!workflow.nodes || workflow.nodes.length === 0) {
    errors.push('Workflow must have at least one node');
  }

  // Check for start node
  const hasStart = workflow.nodes?.some(n => n.type === 'start');
  if (!hasStart) {
    errors.push('Workflow must have a Start node');
  }

  // Check for end node
  const hasEnd = workflow.nodes?.some(n => n.type === 'end');
  if (!hasEnd) {
    errors.push('Workflow must have an End node');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
