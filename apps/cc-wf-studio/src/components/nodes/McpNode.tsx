/**
 * McpNode Component
 *
 * MCP Tool node with 3 configuration modes:
 * 1. Manual Parameter Configuration
 * 2. AI Parameter Configuration
 * 3. AI Tool Selection
 *
 * Migrated from cc-wf-studio and adapted for Auto-Claude
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { McpNodeData } from '@shared/types/workflow';
import { cn } from '@frontend/src/renderer/lib/utils';
import { Badge } from '@frontend/src/renderer/components/ui/badge';

// Helper functions
function getValidationIcon(status: 'valid' | 'missing' | 'invalid'): string {
  switch (status) {
    case 'valid':
      return '✓';
    case 'missing':
      return '⚠';
    case 'invalid':
      return '✗';
  }
}

function getValidationColor(status: 'valid' | 'missing' | 'invalid'): string {
  switch (status) {
    case 'valid':
      return 'text-green-500';
    case 'missing':
      return 'text-yellow-500';
    case 'invalid':
      return 'text-red-500';
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

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
 * Mode Badge Component
 */
interface ModeBadgeProps {
  mode: 'manualParameterConfig' | 'aiParameterConfig' | 'aiToolSelection';
}

const ModeBadge: React.FC<ModeBadgeProps> = ({ mode }) => {
  const modeConfig = {
    manualParameterConfig: { label: 'Manual', variant: 'default' as const, color: 'bg-blue-500' },
    aiParameterConfig: { label: 'AI Params', variant: 'secondary' as const, color: 'bg-purple-500' },
    aiToolSelection: { label: 'AI Tool', variant: 'outline' as const, color: 'bg-green-500' },
  };

  const config = modeConfig[mode];

  return (
    <Badge
      variant={config.variant}
      className={cn('text-[10px] px-1.5 py-0.5', config.color)}
    >
      {config.label}
    </Badge>
  );
};

/**
 * McpNode Component
 */
export const McpNode: React.FC<NodeProps<McpNodeData>> = React.memo(({ data, selected }) => {
  const currentMode = data.mode || 'manualParameterConfig';

  const getTooltipMessage = (status: 'valid' | 'missing' | 'invalid'): string => {
    switch (status) {
      case 'valid':
        return 'MCP tool is valid and ready to use';
      case 'missing':
        return 'MCP server not found or not connected';
      case 'invalid':
        return 'MCP tool configuration is invalid';
    }
  };

  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[200px] max-w-[300px]',
        selected ? 'border-primary' : 'border-border'
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-2.5 h-2.5 bg-muted-foreground border-2 border-background"
      />

      {/* Node Header */}
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        <span>MCP Tool</span>

        {/* Validation Status Icon */}
        <span
          className={cn(
            'text-xs font-bold',
            getValidationColor(data.validationStatus)
          )}
          title={getTooltipMessage(data.validationStatus)}
        >
          {getValidationIcon(data.validationStatus)}
        </span>
      </div>

      {/* Server Name : Tool Name */}
      <div className="text-sm text-foreground mb-1">
        <span className="font-semibold">{data.serverId}</span>
        <span className="font-normal">
          :{' '}
          {currentMode === 'aiToolSelection'
            ? 'Auto selected Tool'
            : data.toolName || 'Untitled Tool'}
          }
        </span>
      </div>

      {/* Mode Badge */}
      <div className="mb-2">
        <ModeBadge mode={currentMode} />
      </div>

      {/* Mode-specific content display */}
      {currentMode === 'aiToolSelection' && data.aiToolSelectionConfig?.taskDescription && (
        <div className="text-[11px] text-muted-foreground mt-2 leading-relaxed line-clamp-2">
          <strong>Task:</strong> {data.aiToolSelectionConfig.taskDescription}
        </div>
      )}

      {currentMode === 'aiParameterConfig' && data.aiParameterConfig?.description && (
        <div className="text-[11px] text-muted-foreground mt-2 leading-relaxed line-clamp-2">
          <strong>Params:</strong> {data.aiParameterConfig.description}
        </div>
      )}

      {currentMode === 'manualParameterConfig' &&
        data.parameterValues &&
        Object.keys(data.parameterValues).length > 0 && (
          <div className="text-[11px] text-muted-foreground mt-2 truncate">
            {getMainParameterPreview(data.parameterValues)}
          </div>
        )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 bg-muted-foreground border-2 border-background"
      />
    </div>
  );
});

McpNode.displayName = 'McpNode';

export default McpNode;
