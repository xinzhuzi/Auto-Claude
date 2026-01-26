/**
 * Node Default Data Factory
 *
 * Provides default data structures for each node type
 */

import type { WorkflowNode } from '../../../shared/types';

/**
 * Generate default data for a node type
 */
export function getNodeDefaults(nodeType: string): Partial<WorkflowNode['data']> {
  switch (nodeType) {
    case 'start':
      return {
        label: 'Start',
      };

    case 'end':
      return {
        label: 'End',
      };

    case 'prompt':
      return {
        label: 'Prompt',
        prompt: '',
      };

    case 'skill':
      return {
        name: 'Untitled Skill',
        description: '',
        skillPath: '',
        scope: 'user',
        allowedTools: '',
        validationStatus: 'valid',
      };

    case 'mcp':
      return {
        serverId: '',
        toolName: '',
        mode: 'manualParameterConfig',
        parameterValues: {},
        validationStatus: 'valid',
      };

    case 'subAgent':
      return {
        description: 'Untitled Sub-Agent',
        prompt: '',
        model: 'inherit',
        tools: '',
        color: 'blue',
      };

    case 'ifElse':
      return {
        evaluationTarget: '',
        branches: [
          {
            id: 'if-branch',
            label: 'If',
            condition: '',
          },
          {
            id: 'else-branch',
            label: 'Else',
            condition: '',
          },
        ],
      };

    case 'switch':
      return {
        evaluationTarget: '',
        branches: [
          {
            id: 'case-1',
            label: 'Case 1',
            condition: '',
            isDefault: false,
          },
          {
            id: 'case-2',
            label: 'Case 2',
            condition: '',
            isDefault: false,
          },
          {
            id: 'default-case',
            label: 'Default',
            condition: '',
            isDefault: true,
          },
        ],
        outputPorts: 3,
      };

    case 'askUserQuestion':
      return {
        questionText: 'Untitled Question',
        options: [
          {
            id: 'opt-1',
            label: 'Option 1',
            description: '',
          },
          {
            id: 'opt-2',
            label: 'Option 2',
            description: '',
          },
        ],
        multiSelect: false,
        useAiSuggestions: false,
      };

    default:
      return {
        label: 'Untitled Node',
      };
  }
}

/**
 * Generate a unique node ID
 */
export function generateNodeId(nodeType: string): string {
  return `${nodeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique connection ID
 */
export function generateConnectionId(from: string, to: string): string {
  return `${from}-${to}-${Date.now()}`;
}
