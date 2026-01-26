/**
 * AskUserQuestionNode Component
 *
 * Node for asking user questions during workflow execution
 * Supports single/multi-select and AI suggestions
 * Migrated from cc-wf-studio and adapted for Auto-Claude
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { AskUserQuestionData } from '@shared/types/workflow';
import { cn } from '@frontend/src/renderer/lib/utils';
import { Badge } from '@frontend/src/renderer/components/ui/badge';

export const AskUserQuestionNode: React.FC<NodeProps<AskUserQuestionData>> = React.memo(({ data, selected }) => {
  const options = data.options || [];

  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[200px] max-w-[300px]',
        selected ? 'border-primary' : 'border-purple-500'
      )}
    >
      {/* Node Header */}
      <div className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Ask User
      </div>

      {/* Question Text */}
      <div className="text-sm text-foreground mb-2 font-medium">
        {data.questionText || 'Untitled Question'}
      </div>

      {/* Options Count */}
      {options.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
            {options.length} Option{options.length !== 1 ? 's' : ''}
          </Badge>
          {data.multiSelect && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
              Multi
            </Badge>
          )}
          {data.useAiSuggestions && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
              AI Suggestions
            </Badge>
          )}
        </div>
      )}

      {/* Options Preview */}
      {options.length > 0 && (
        <div className="text-[11px] text-muted-foreground">
          {options.slice(0, 2).map((opt) => opt.label).join(', ')}
          {options.length > 2 && '...'}
        </div>
      )}

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 bg-muted-foreground border-2 border-background"
      />

      {/* Output Handles (dynamic based on mode) */}
      {options.map((opt, i) => (
        <Handle
          key={opt.id || `option-${i}`}
          type="source"
          position={Position.Right}
          id={`option-${i}`}
          className="w-3 h-3 bg-muted-foreground border-2 border-background"
          style={{ top: `${((i + 1) / (options.length + 1)) * 100}%` }}
        />
      ))}
    </div>
  );
});

AskUserQuestionNode.displayName = 'AskUserQuestionNode';

export default AskUserQuestionNode;
