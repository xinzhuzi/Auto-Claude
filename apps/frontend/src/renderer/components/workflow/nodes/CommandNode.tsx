/**
 * CommandNode Component
 *
 * Custom React Flow node for executing Claude commands (slash commands).
 * Executes commands from .claude/commands/ directory.
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import { Terminal, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface CommandNodeData {
  commandName: string;
  commandPath?: string;
  description?: string;
  args?: string;
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
      return '命令有效，可以执行';
    case 'missing':
      return '命令文件不存在';
    case 'invalid':
      return '命令配置无效';
  }
}

/**
 * CommandNode Component
 */
export const CommandNode: React.FC<NodeProps<CommandNodeData>> = ({
  id,
  data,
  selected,
}) => {
  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[200px] max-w-[300px]',
        selected ? 'border-primary' : 'border-border'
      )}
    >
      {/* Node Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <Terminal className="h-4 w-4 text-primary" />
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          快捷命令
        </div>
        {/* Validation Status Icon */}
        <div title={getValidationTooltip(data.validationStatus)}>
          {getValidationIcon(data.validationStatus)}
        </div>
      </div>

      {/* Command Name */}
      <div className="text-[13px] text-foreground mb-1 font-medium">
        /{data.commandName || '未选择命令'}
      </div>

      {/* Description */}
      {data.description && (
        <div className="text-[11px] text-muted-foreground mb-2 line-clamp-2">
          {data.description}
        </div>
      )}

      {/* Args Preview */}
      {data.args && (
        <div className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded font-mono truncate">
          参数: {data.args}
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

CommandNode.displayName = 'CommandNode';
