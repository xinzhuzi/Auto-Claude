/**
 * EndNode Component
 *
 * Ending point of a workflow
 */

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '../../ui/card';
import { StopCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const EndNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <Card className={cn(
      "w-48 p-4 border-2 transition-all bg-red-50 dark:bg-red-950",
      selected && "border-red-500 dark:border-red-400"
    )}>
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-4 !h-4 !bg-red-500 !border-2 !border-background"
      />

      <div className="flex items-center gap-2 mb-2">
        <StopCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
        <div className="font-semibold text-sm">结束</div>
      </div>

      <div className="text-xs text-muted-foreground">
        工作流在这里结束
      </div>
    </Card>
  );
};
