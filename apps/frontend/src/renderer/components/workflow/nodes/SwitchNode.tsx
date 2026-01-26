/**
 * SwitchNode Component
 *
 * Custom React Flow node for multi-way conditional branching (Switch/Case).
 * Adapted from cc-wf-studio for Auto-Claude.
 */

import React, { useEffect } from 'react';
import { Handle, type NodeProps, Position, useUpdateNodeInternals } from 'reactflow';
import { cn } from '../../../lib/utils';

export interface SwitchNodeData {
  branches: Array<{
    id: string;
    label: string;
    condition?: string;
    isDefault?: boolean;
  }>;
}

/**
 * SwitchNode Component
 */
export const SwitchNode: React.FC<NodeProps<SwitchNodeData>> = ({
  id,
  data,
  selected,
}) => {
  const updateNodeInternals = useUpdateNodeInternals();

  // Update React Flow's internal calculations when port count changes
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals, data.branches?.length]);

  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[200px] max-w-[300px]',
        selected ? 'border-primary' : 'border-border'
      )}
    >
      {/* Node Header */}
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Switch
      </div>

      {/* Branch Type Badge */}
      <div className="text-[10px] text-primary-foreground bg-primary/80 px-1.5 py-0.5 rounded inline-block mb-3">
        Multi-way Branch ({data.branches?.length || 0} branches)
      </div>

      {/* Branches List */}
      {data.branches && data.branches.length > 0 && (
        <div className="mb-2 space-y-2">
          {data.branches.map((branch, index) => (
            <div
              key={branch.id || `branch-${index}`}
              className={cn(
                'text-[11px] p-2 bg-muted rounded border-l-[3px]',
                branch.isDefault ? 'border-l-yellow-500' : 'border-l-blue-500'
              )}
            >
              <div className="font-semibold text-foreground mb-1">
                {branch.label}
              </div>
              <div className="text-[10px] text-muted-foreground italic">
                {branch.condition || '(条件未設定)'}
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
        className="w-3 h-3 bg-primary border-2 border-background"
      />

      {/* Dynamic Output Handles */}
      {data.branches?.map((branch, i) => (
        <Handle
          key={branch.id || `branch-${i}`}
          type="source"
          position={Position.Right}
          id={`branch-${i}`}
          className="w-3 h-3 bg-primary border-2 border-background"
          style={{
            top: `${((i + 1) / (data.branches.length + 1)) * 100}%`,
          }}
        />
      ))}
    </div>
  );
};

SwitchNode.displayName = 'SwitchNode';
