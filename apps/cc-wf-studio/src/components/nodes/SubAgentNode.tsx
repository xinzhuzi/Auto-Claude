/**
 * SubAgentNode Component
 *
 * Custom React Flow node for Sub-Agent
 * Migrated from cc-wf-studio and adapted for Auto-Claude
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { SubAgentData } from '@shared/types/workflow';
import { SUB_AGENT_COLORS } from '@shared/types/workflow';
import { cn } from '@frontend/src/renderer/lib/utils';
import { Badge } from '@frontend/src/renderer/components/ui/badge';

export const SubAgentNode: React.FC<NodeProps<SubAgentData>> = React.memo(({ data, selected }) => {
  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[200px] max-w-[300px]',
        selected ? 'border-primary' : 'border-border'
      )}
    >
      {/* Node Header */}
      <div className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Sub-Agent
      </div>

      {/* Node Description */}
      <div className="text-sm text-foreground mb-2 font-medium">
        {data.description || 'Untitled Sub-Agent'}
      </div>

      {/* Prompt Preview */}
      {data.prompt && (
        <div className="text-[11px] text-muted-foreground mb-2 leading-relaxed line-clamp-2">
          {data.prompt}
        </div>
      )}

      {/* Badges */}
      <div className="flex gap-1 flex-wrap">
        {/* Model Badge */}
        {data.model && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
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
      </div>

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

SubAgentNode.displayName = 'SubAgentNode';

export default SubAgentNode;
