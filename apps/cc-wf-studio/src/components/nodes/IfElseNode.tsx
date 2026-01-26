/**
 * IfElseNode Component
 *
 * Binary conditional branching (If/Else)
 * Fixed 2-way branching: True/False, Yes/No, Success/Error
 * Migrated from cc-wf-studio and adapted for Auto-Claude
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { IfElseNodeData } from '@shared/types/workflow';
import { cn } from '@frontend/src/renderer/lib/utils';
import { Badge } from '@frontend/src/renderer/components/ui/badge';

export const IfElseNode: React.FC<NodeProps<IfElseNodeData>> = React.memo(({ data, selected }) => {
  // Ensure exactly 2 branches
  const branches = data.branches?.slice(0, 2) || [
    { id: '1', label: 'True', condition: 'Condition is true' },
    { id: '2', label: 'False', condition: 'Condition is false' }
  ];

  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[180px] max-w-[280px]',
        selected ? 'border-primary' : 'border-border'
      )}
    >
      {/* Node Header */}
      <div className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        If/Else
      </div>

      {/* Branch Type Badge */}
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 mb-3">
        2-way Branch
      </Badge>

      {/* Branches List */}
      {branches.length > 0 && (
        <div className="mb-2">
          {branches.map((branch, index) => (
            <div
              key={branch.id || `branch-${index}`}
              className="mb-2 p-2 bg-muted border-l-4 rounded-md"
              style={{
                borderColor: index === 0 ? 'rgb(34 197 94)' : 'rgb(239 68 68)',
              }}
            >
              <div className="text-sm font-semibold text-foreground mb-1">
                {branch.label}
              </div>
              <div className="text-[10px] text-muted-foreground italic">
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

      {/* Fixed 2 Output Handles */}
      {branches.map((branch, i) => (
        <Handle
          key={branch.id || `branch-${i}`}
          type="source"
          position={Position.Right}
          id={`branch-${i}`}
          className="w-3 h-3 bg-muted-foreground border-2 border-background"
          style={{ top: `${((i + 1) / 3) * 100}%` }}
        />
      ))}
    </div>
  );
});

IfElseNode.displayName = 'IfElseNode';

export default IfElseNode;
