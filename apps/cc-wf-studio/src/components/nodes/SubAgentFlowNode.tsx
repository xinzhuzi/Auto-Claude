/**
 * SubAgentFlowNode Component
 *
 * Reference node for executing a sub-agent flow
 * Migrated from cc-wf-studio and adapted for Auto-Claude
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { SubAgentFlowNodeData } from '@shared/types/workflow';
import { SUB_AGENT_COLORS } from '@shared/types/workflow';
import { cn } from '@frontend/src/renderer/lib/utils';
import { Badge } from '@frontend/src/renderer/components/ui/badge';

export const SubAgentFlowNode: React.FC<NodeProps<SubAgentFlowNodeData>> = React.memo(({ data, selected }) => {
  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[200px] max-w-[300px]',
        selected ? 'border-primary' : 'border-indigo-500'
      )}
    >
      {/* Node Header */}
      <div className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Sub-Agent Flow
      </div>

      {/* Flow Label */}
      <div className="text-sm font-semibold text-foreground mb-1">
        {data.label}
      </div>

      {/* Description */}
      {data.description && (
        <div className="text-[11px] text-muted-foreground mb-2 line-clamp-2">
          {data.description}
        </div>
      )}

      {/* Model Badge */}
      {data.model && data.model !== 'inherit' && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 mr-1">
          {data.model}
        </Badge>
      )}

      {/* Color Badge */}
      {data.color && (
        <Badge
          variant="default"
          className="text-[10px] px-1.5 py-0.5 capitalize"
          style={{
            backgroundColor: SUB_AGENT_COLORS[data.color],
          }}
        >
          {data.color}
        </Badge>
      )}

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

SubAgentFlowNode.displayName = 'SubAgentFlowNode';

export default SubAgentFlowNode;
