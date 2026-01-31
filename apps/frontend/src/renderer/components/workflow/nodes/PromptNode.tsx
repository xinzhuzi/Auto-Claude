/**
 * PromptNode Component
 *
 * Text prompt node for user input
 */

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
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

      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-primary" />
        <div className="font-semibold text-sm">Prompt</div>
      </div>

      <div className="space-y-3">
        <Input
          value={data?.label || ''}
          onChange={(e) => data?.onUpdate?.({ label: e.target.value })}
          placeholder="Prompt name..."
          className="text-sm"
        />

        <Textarea
          value={data?.prompt || ''}
          onChange={(e) => data?.onUpdate?.({ prompt: e.target.value })}
          placeholder="Enter your prompt..."
          rows={3}
          className="text-sm resize-none"
        />
      </div>
    </Card>
  );
};
