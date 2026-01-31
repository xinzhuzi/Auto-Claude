/**
 * IfElseNode Component
 *
 * Custom React Flow node for binary conditional branching (If/Else).
 * Adapted from cc-wf-studio for Auto-Claude.
 */

import React, { useEffect } from 'react';
import { Handle, type NodeProps, Position, useUpdateNodeInternals } from 'reactflow';
import { cn } from '../../../lib/utils';

export interface IfElseNodeData {
  branches: Array<{
    id: string;
    label: string;
    condition?: string;
  }>;
}

/**
 * IfElseNode Component
 */
export const IfElseNode: React.FC<NodeProps<IfElseNodeData>> = ({
  id,
  data,
  selected,
}) => {
  const updateNodeInternals = useUpdateNodeInternals();

  // Update React Flow's internal calculations when port count changes
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);

  // Ensure exactly 2 branches (defensive programming)
  const branches = data.branches?.slice(0, 2) || [];

  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[180px] max-w-[280px]',
        selected ? 'border-primary' : 'border-border'
      )}
    >
      {/* Node Header */}
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        If/Else
      </div>

      {/* Branch Type Badge */}
      <div className="text-[10px] text-primary-foreground bg-primary/80 px-1.5 py-0.5 rounded inline-block mb-3">
        2-way Branch
      </div>

      {/* Branches List */}
      {branches.length > 0 && (
        <div className="mb-2 space-y-2">
          {branches.map((branch, index) => (
            <div
              key={branch.id || `branch-${index}`}
              className={cn(
                'text-[11px] p-2 bg-muted rounded border-l-[3px]',
                index === 0 ? 'border-l-green-500' : 'border-l-red-500'
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
        className="!w-4 !h-4 !bg-primary !border-2 !border-background"
      />

      {/* Fixed 2 Output Handles */}
      {branches.map((branch, i) => (
        <Handle
          key={branch.id || `branch-${i}`}
          type="source"
          position={Position.Right}
          id={`branch-${i}`}
          className="!w-4 !h-4 !bg-primary !border-2 !border-background"
          style={{
            top: `${((i + 1) / 3) * 100}%`, // Fixed positions for 2 branches (33%, 66%)
          }}
        />
      ))}
    </div>
  );
};

IfElseNode.displayName = 'IfElseNode';
