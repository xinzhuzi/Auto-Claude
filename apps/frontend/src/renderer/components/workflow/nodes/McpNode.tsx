/**
 * McpNode Component
 *
 * Custom React Flow node for MCP Tool invocation.
 * Adapted from cc-wf-studio for Auto-Claude.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
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
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * McpNode Component
 */
export const McpNode: React.FC<NodeProps<McpNodeData>> = ({
  id,
  data,
  selected,
}) => {
  const { t } = useTranslation('workflowStudio');

  // Get current mode (default to 'manualParameterConfig' for backwards compatibility)
  const currentMode = data.mode || 'manualParameterConfig';

  const getValidationTooltip = (status: 'valid' | 'missing' | 'invalid'): string => {
    switch (status) {
      case 'valid':
        return t('valid');
      case 'missing':
        return t('missing');
      case 'invalid':
        return t('invalid');
    }
  };

  const getModeBadgeLabel = (mode: McpNodeData['mode']): string => {
    switch (mode) {
      case 'aiToolSelection':
        return t('mcpEditDialog.aiToolMode');
      case 'aiParameterConfig':
        return t('mcpEditDialog.aiParamMode');
      case 'manualParameterConfig':
      default:
        return t('mcpEditDialog.manualMode');
    }
  };

  const getMainParameterPreview = (parameterValues: Record<string, unknown>): string => {
    const entries = Object.entries(parameterValues).slice(0, 2);
    if (entries.length === 0) return t('mcpEditDialog.noParams');

    return entries
      .map(([key, value]) => {
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return `${key}: ${truncateText(valueStr, 30)}`;
      })
      .join(', ');
  };

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
          {t('nodes.mcp.label')}
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
            ? t('mcpEditDialog.aiToolMode')
            : data.toolName || t('nodes.mcp.label')}
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
          <strong>{t('taskDescription')}:</strong> {data.aiToolSelectionConfig.taskDescription}
        </div>
      )}

      {currentMode === 'aiParameterConfig' && data.aiParameterConfig?.description && (
        <div className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
          <strong>{t('parameters')}:</strong> {data.aiParameterConfig.description}
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
        className="!w-4 !h-4 !bg-primary !border-2 !border-background"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-4 !h-4 !bg-primary !border-2 !border-background"
      />
    </div>
  );
};

McpNode.displayName = 'McpNode';
