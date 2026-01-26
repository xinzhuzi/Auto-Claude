/**
 * Branch Node Component
 * =====================
 *
 * Represents a branch in Switch node.
 */

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface BranchNodeData {
  label: string;
  condition?: string;
  isDefault?: boolean;
}

export const BranchNode: React.FC<NodeProps<BranchNodeData>> = ({ data, selected }) => {
  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-card shadow-sm min-w-[180px]',
        selected ? 'border-primary' : 'border-border',
        'hover:shadow-md transition-shadow'
      )}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="h-4 w-4 text-purple-500" />
        <span className="font-medium text-sm">
          {data.isDefault ? 'Default Branch' : 'Branch'}
        </span>
      </div>

      <div className="space-y-1">
        <div className="text-sm font-medium">{data.label}</div>
        {data.condition && (
          <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
            {data.condition}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};
