/**
 * McpNode Component
 *
 * Custom React Flow node for MCP Tool invocation.
 * Adapted from cc-wf-studio for Auto-Claude.
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface McpNodeData {
  serverId: string;
  toolName?: string;
  mode?: 'manualParameterConfig' | 'aiParameterConfig' | 'aiToolSelection';
  parameterValues?: Record<string, unknown>;
  aiParameterConfig?: {
    description: string;
  };
  aiToolSelectionConfig?: {
    taskDescription: string;
  };
  validationStatus: 'valid' | 'missing' | 'invalid';
}

/**
 * Get validation status icon
 */
function getValidationIcon(status: 'valid' | 'missing' | 'invalid') {
  switch (status) {
    case 'valid':
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    case 'missing':
      return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    case 'invalid':
      return <XCircle className="h-3 w-3 text-red-500" />;
  }
}

/**
 * Get validation tooltip message
 */
function getValidationTooltip(status: 'valid' | 'missing' | 'invalid'): string {
  switch (status) {
    case 'valid':
      return 'MCP tool is valid and ready to use';
    case 'missing':
      return 'MCP server not found or not connected';
    case 'invalid':
      return 'MCP tool configuration is invalid';
  }
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Get main parameter values for display (up to 2 parameters)
 */
function getMainParameterPreview(parameterValues: Record<string, unknown>): string {
  const entries = Object.entries(parameterValues).slice(0, 2);
  if (entries.length === 0) return 'No parameters configured';

  return entries
    .map(([key, value]) => {
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `${key}: ${truncateText(valueStr, 30)}`;
    })
    .join(', ');
}

/**
 * Get mode badge label
 */
function getModeBadgeLabel(mode: McpNodeData['mode']): string {
  switch (mode) {
    case 'aiToolSelection':
      return 'AI Tool Selection';
    case 'aiParameterConfig':
      return 'AI Parameters';
    case 'manualParameterConfig':
    default:
      return 'Manual Config';
  }
}

/**
 * McpNode Component
 */
export const McpNode: React.FC<NodeProps<McpNodeData>> = ({
  id,
  data,
  selected,
}) => {
  // Get current mode (default to 'manualParameterConfig' for backwards compatibility)
  const currentMode = data.mode || 'manualParameterConfig';

  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[200px] max-w-[300px]',
        selected ? 'border-primary' : 'border-border'
      )}
    >
      {/* Node Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          MCP Tool
        </div>
        {/* Validation Status Icon */}
        <div title={getValidationTooltip(data.validationStatus)}>
          {getValidationIcon(data.validationStatus)}
        </div>
      </div>

      {/* Server Name : Tool Name */}
      <div className="text-[13px] text-foreground mb-1">
        <span className="font-semibold">{data.serverId}</span>
        <span className="font-normal">
          :{' '}
          {currentMode === 'aiToolSelection'
            ? 'Auto selected Tool'
            : data.toolName || 'Untitled Tool'}
        </span>
      </div>

      {/* Mode Badge */}
      <div className="mb-2">
        <div className="text-[10px] text-primary-foreground bg-primary/80 px-1.5 py-0.5 rounded inline-block">
          {getModeBadgeLabel(currentMode)}
        </div>
      </div>

      {/* Mode-specific content display */}
      {currentMode === 'aiToolSelection' && data.aiToolSelectionConfig?.taskDescription && (
        <div className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
          <strong>Task:</strong> {data.aiToolSelectionConfig.taskDescription}
        </div>
      )}

      {currentMode === 'aiParameterConfig' && data.aiParameterConfig?.description && (
        <div className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
          <strong>Params:</strong> {data.aiParameterConfig.description}
        </div>
      )}

      {currentMode === 'manualParameterConfig' &&
        data.parameterValues &&
        Object.keys(data.parameterValues).length > 0 && (
          <div className="text-[11px] text-muted-foreground mt-2 truncate leading-relaxed">
            {getMainParameterPreview(data.parameterValues)}
          </div>
        )}

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 bg-primary border-2 border-background"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 bg-primary border-2 border-background"
      />
    </div>
  );
};

McpNode.displayName = 'McpNode';
