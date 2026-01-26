/**
 * PromptNode Component
 *
 * Prompt template node with variable substitution support
 * Migrated from cc-wf-studio and adapted for Auto-Claude
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { PromptNodeData } from '@shared/types/workflow';
import { cn } from '@frontend/src/renderer/lib/utils';
import { Badge } from '@frontend/src/renderer/components/ui/badge';

// Simple variable extraction (can be enhanced later)
function extractVariables(prompt: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = [];
  let match;
  while ((match = regex.exec(prompt)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

export const PromptNode: React.FC<NodeProps<PromptNodeData>> = React.memo(({ data, selected }) => {
  const label = data.label || 'Prompt';
  const variables = extractVariables(data.prompt || '');
  const previewText = data.prompt && data.prompt.length > 100
    ? `${data.prompt.substring(0, 100)}...`
    : data.prompt || '';

  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[200px] max-w-[300px]',
        selected ? 'border-primary' : 'border-blue-500'
      )}
    >
      {/* Node Header */}
      <div className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Prompt
      </div>

      {/* Label */}
      <div className="text-sm text-foreground mb-2 font-medium">
        {label}
      </div>

      {/* Prompt Preview */}
      {data.prompt && (
        <div className="text-[11px] text-muted-foreground mb-2 leading-relaxed line-clamp-2">
          {previewText}
        </div>
      )}

      {/* Variables Badge */}
      {variables.length > 0 && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
          {variables.length} variable{variables.length !== 1 ? 's' : ''}
        </Badge>
      )}

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="w-3 h-3 bg-muted-foreground border-2 border-background"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="w-3 h-3 bg-muted-foreground border-2 border-background"
      />
    </div>
  );
});

PromptNode.displayName = 'PromptNode';

export default PromptNode;
