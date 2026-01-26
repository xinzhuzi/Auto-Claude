/**
 * SkillNode Component
 *
 * Custom React Flow node for Claude Skills.
 * Adapted from cc-wf-studio for Auto-Claude.
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface SkillNodeData {
  name: string;
  description?: string;
  scope: 'user' | 'local' | 'global';
  allowedTools?: string;
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
      return 'Skill is valid and ready to use';
    case 'missing':
      return 'Skill not found';
    case 'invalid':
      return 'Skill configuration is invalid';
  }
}

/**
 * SkillNode Component
 */
export const SkillNode: React.FC<NodeProps<SkillNodeData>> = ({
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
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Skill
        </div>
        {/* Validation Status Icon */}
        <div title={getValidationTooltip(data.validationStatus)}>
          {getValidationIcon(data.validationStatus)}
        </div>
      </div>

      {/* Skill Name */}
      <div className="text-[13px] text-foreground mb-2 font-medium">
        {data.name || 'Untitled Skill'}
      </div>

      {/* Description */}
      {data.description && (
        <div className="text-[11px] text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
          {data.description}
        </div>
      )}

      {/* Scope Badge */}
      <div
        className={cn(
          'text-[10px] px-1.5 py-0.5 rounded inline-block uppercase font-semibold tracking-wide',
          data.scope === 'user' && 'bg-primary/80 text-primary-foreground',
          data.scope === 'local' && 'bg-blue-500/80 text-white',
          data.scope === 'global' && 'bg-secondary text-secondary-foreground'
        )}
      >
        {data.scope}
      </div>

      {/* Allowed Tools Badge (if specified) */}
      {data.allowedTools && (
        <div
          className="text-[9px] text-muted-foreground mt-1 truncate"
          title={`Allowed Tools: ${data.allowedTools}`}
        >
          🔧 {data.allowedTools}
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

SkillNode.displayName = 'SkillNode';
