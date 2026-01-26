/**
 * StartNode Component
 *
 * Starting point of a workflow
 */

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '../../ui/card';
import { Play } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const StartNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <Card className={cn(
      "w-48 p-4 border-2 transition-all bg-green-50 dark:bg-green-950",
      selected && "border-green-500 dark:border-green-400"
    )}>
      <Handle type="source" position={Position.Bottom} />

      <div className="flex items-center gap-2 mb-2">
        <Play className="w-4 h-4 text-green-600 dark:text-green-400" />
        <div className="font-semibold text-sm">Start</div>
      </div>

      <div className="text-xs text-muted-foreground">
        Workflow begins here
      </div>
    </Card>
  );
};
