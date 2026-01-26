/**
 * SubAgent Flow Node Component
 * =============================
 *
 * Represents a sub-agent flow (nested workflow).
 */

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Workflow, ExternalLink } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface SubAgentFlowNodeData {
  flowName: string;
  description?: string;
  nodeCount?: number;
}

export const SubAgentFlowNode: React.FC<NodeProps<SubAgentFlowNodeData>> = ({
  data,
  selected,
}) => {
  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-card shadow-sm min-w-[200px]',
        selected ? 'border-primary' : 'border-border',
        'hover:shadow-md transition-shadow'
      )}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex items-center gap-2 mb-2">
        <Workflow className="h-4 w-4 text-indigo-500" />
        <span className="font-medium text-sm">Sub-Agent Flow</span>
        <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
      </div>

      <div className="space-y-1">
        <div className="text-sm font-medium">{data.flowName}</div>
        {data.description && (
          <div className="text-xs text-muted-foreground line-clamp-2">
            {data.description}
          </div>
        )}
        {data.nodeCount !== undefined && (
          <div className="text-xs text-muted-foreground">
            {data.nodeCount} nodes
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};
