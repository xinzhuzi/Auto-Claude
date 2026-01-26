/**
 * StartNode Component
 *
 * Workflow start node component
 *
 * Features:
 * - Output connection only (no input connection)
 * - Visual indication of workflow start
 * - Custom label support
 *
 * Migrated from cc-wf-studio and adapted for Auto-Claude
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { StartNodeData } from '@shared/types/workflow';
import { cn } from '@frontend/src/renderer/lib/utils';

/**
 * StartNode Component
 *
 * @param data - Node data (label: custom label)
 * @param selected - Whether node is selected
 */
export const StartNode: React.FC<NodeProps<StartNodeData>> = React.memo(({ data, selected }) => {
  const label = data.label || 'Start';

  return (
    <div
      className={cn(
        'relative px-3 py-3 rounded-lg border-2 bg-background min-w-[120px]',
        selected ? 'border-primary' : 'border-green-500'
      )}
    >
      {/* Node Header */}
      <div className="flex items-center gap-2 text-sm font-semibold text-green-500">
        <span aria-hidden="true">▶</span>
        <span>{label}</span>
      </div>

      {/* Output handle only */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="w-3 h-3 bg-muted-foreground border-2 border-background"
      />
    </div>
  );
});

StartNode.displayName = 'StartNode';

export default StartNode;
