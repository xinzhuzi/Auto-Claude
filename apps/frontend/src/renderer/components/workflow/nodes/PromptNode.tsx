/**
 * PromptNode Component
 *
 * Text prompt node - displays prompt content from property panel
 */

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '../../ui/card';
import { MessageSquare } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const PromptNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <Card className={cn(
      "w-64 p-4 border-2 transition-all",
      selected && "border-primary"
    )}>
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-4 !h-4 !bg-primary !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-4 !h-4 !bg-primary !border-2 !border-background"
      />

      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <div className="font-semibold text-sm">{data?.label || 'Prompt'}</div>
      </div>

      {/* Display prompt content as text */}
      <div className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
        {data?.prompt || '点击编辑提示词...'}
      </div>
    </Card>
  );
};
