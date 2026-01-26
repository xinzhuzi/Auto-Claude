/**
 * SkillNode Component
 *
 * Claude Code Skill integration node
 * Validates and executes .claude/skills/ definitions
 * Migrated from cc-wf-studio and adapted for Auto-Claude
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { SkillNodeData } from '@shared/types/workflow';
import { cn } from '@frontend/src/renderer/lib/utils';
import { Badge } from '@frontend/src/renderer/components/ui/badge';

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

export const SkillNode: React.FC<NodeProps<SkillNodeData>> = React.memo(({ data, selected }) => {
  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[200px] max-w-[300px]',
        selected ? 'border-primary' : 'border-orange-500'
      )}
    >
      {/* Node Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Skill
        </div>

        {/* Validation Status */}
        <span
          className={cn(
            'text-xs font-bold',
            getValidationColor(data.validationStatus)
          )}
          title={data.validationStatus === 'valid' ? 'Skill found' : 'Skill not found'}
        >
          {getValidationIcon(data.validationStatus)}
        </span>
      </div>

      {/* Skill Name */}
      <div className="text-sm font-semibold text-foreground mb-1">
        {data.name}
      </div>

      {/* Description */}
      {data.description && (
        <div className="text-[11px] text-muted-foreground mb-2 line-clamp-2">
          {data.description}
        </div>
      )}

      {/* Scope Badge */}
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
        {data.scope}
      </Badge>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 bg-muted-foreground border-2 border-background"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 bg-muted-foreground border-2 border-background"
      />
    </div>
  );
});

SkillNode.displayName = 'SkillNode';

export default SkillNode;
