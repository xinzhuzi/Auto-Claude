/**
 * EndNode Component
 *
 * Workflow end node component
 *
 * Features:
 * - Input connection only (no output connection)
 * - Visual indication of workflow end
 * - Custom label support
 *
 * Migrated from cc-wf-studio and adapted for Auto-Claude
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { EndNodeData } from '@shared/types/workflow';
import { cn } from '@frontend/src/renderer/lib/utils';

/**
 * EndNode Component
 *
 * @param data - Node data (label: custom label)
 * @param selected - Whether node is selected
 */
export const EndNode: React.FC<NodeProps<EndNodeData>> = React.memo(({ data, selected }) => {
  const label = data.label || 'End';

  return (
    <div
      className={cn(
        'relative px-3 py-3 rounded-lg border-2 bg-background min-w-[120px]',
        selected ? 'border-primary' : 'border-red-500'
      )}
    >
      {/* Node Header */}
      <div className="flex items-center gap-2 text-sm font-semibold text-red-500">
        <span aria-hidden="true">■</span>
        <span>{label}</span>
      </div>

      {/* Input handle only */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="w-3 h-3 bg-muted-foreground border-2 border-background"
      />
    </div>
  );
});

EndNode.displayName = 'EndNode';

export default EndNode;
