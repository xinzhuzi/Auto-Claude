/**
 * SwitchNode Component
 *
 * Multi-way conditional branching (Switch)
 * 2-N branches with default branch support
 * Migrated from cc-wf-studio and adapted for Auto-Claude
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { SwitchNodeData, SwitchCondition } from '@shared/types/workflow';
import { cn } from '@frontend/src/renderer/lib/utils';
import { Badge } from '@frontend/src/renderer/components/ui/badge';

export const SwitchNode: React.FC<NodeProps<SwitchNodeData>> = React.memo(({ data, selected }) => {
  const branches = data.branches || [];

  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[200px] max-w-[320px]',
        selected ? 'border-primary' : 'border-border'
      )}
    >
      {/* Node Header */}
      <div className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Switch
      </div>

      {/* Branch Type Badge */}
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 mb-2">
        {branches.length}-way Branch
      </Badge>

      {/* Branches List */}
      {branches.length > 0 && (
        <div className="mb-2 max-h-[200px] overflow-y-auto">
          {branches.map((branch, index) => (
            <div
              key={branch.id || `branch-${index}`}
              className={cn(
                'mb-1.5 p-2 bg-muted rounded border-l-2',
                branch.isDefault ? 'border-yellow-500' : 'border-border'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">
                  {branch.label}
                </span>
                {branch.isDefault && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    Default
                  </Badge>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground italic truncate">
                {branch.condition || '(condition not set)'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 bg-muted-foreground border-2 border-background"
      />

      {/* Output Handles */}
      {branches.map((branch, i) => (
        <Handle
          key={branch.id || `branch-${i}`}
          type="source"
          position={Position.Right}
          id={`branch-${i}`}
          className="w-3 h-3 bg-muted-foreground border-2 border-background"
          style={{ top: `${((i + 1) / (branches.length + 1)) * 100}%` }}
        />
      ))}
    </div>
  );
});

SwitchNode.displayName = 'SwitchNode';

export default SwitchNode;
