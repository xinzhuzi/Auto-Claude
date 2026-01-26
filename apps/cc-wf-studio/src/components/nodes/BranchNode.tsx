/**
 * BranchNode Component
 *
 * Legacy conditional node (kept for backward compatibility)
 * Use IfElseNode or SwitchNode for new workflows
 * Migrated from cc-wf-studio and adapted for Auto-Claude
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { BranchNodeData } from '@shared/types/workflow';
import { cn } from '@frontend/src/renderer/lib/utils';
import { Badge } from '@frontend/src/renderer/components/ui/badge';

export const BranchNode: React.FC<NodeProps<BranchNodeData>> = React.memo(({ data, selected }) => {
  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[180px] max-w-[280px]',
        selected ? 'border-primary' : 'border-yellow-600'
      )}
    >
      {/* Warning Badge */}
      <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 mb-2 border-yellow-600 text-yellow-600">
        Legacy
      </Badge>

      {/* Node Header */}
      <div className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Branch
      </div>

      {/* Branch Type */}
      <div className="text-xs text-muted-foreground mb-2">
        {data.branchType === 'conditional' ? 'Conditional (2-way)' : 'Switch (multi-way)'}
      </div>

      {/* Branches Count */}
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
        {data.branches.length} Branch{data.branches.length !== 1 ? 'es' : ''}
      </Badge>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 bg-muted-foreground border-2 border-background"
      />

      {/* Output Handles */}
      {data.branches.map((_, i) => (
        <Handle
          key={`branch-${i}`}
          type="source"
          position={Position.Right}
          id={`branch-${i}`}
          className="w-3 h-3 bg-muted-foreground border-2 border-background"
          style={{ top: `${((i + 1) / (data.branches.length + 1)) * 100}%` }}
        />
      ))}
    </div>
  );
});

BranchNode.displayName = 'BranchNode';

export default BranchNode;
