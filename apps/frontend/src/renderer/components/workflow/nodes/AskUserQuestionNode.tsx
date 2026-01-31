/**
 * AskUserQuestionNode Component
 *
 * Custom React Flow node for AskUserQuestion with dynamic 2-4 output ports.
 * Adapted from cc-wf-studio for Auto-Claude.
 */

import React, { useEffect } from 'react';
import { Handle, type NodeProps, Position, useUpdateNodeInternals } from 'reactflow';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface AskUserQuestionData {
  questionText: string;
  options: Array<{ label: string; description?: string }>;
  useAiSuggestions?: boolean;
  multiSelect?: boolean;
}

/**
 * AskUserQuestionNode Component
 */
export const AskUserQuestionNode: React.FC<NodeProps<AskUserQuestionData>> = ({
  id,
  data,
  selected,
}) => {
  const updateNodeInternals = useUpdateNodeInternals();

  // Update React Flow's internal calculations when port count changes
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals, data.options?.length]);

  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[200px] max-w-[300px]',
        selected ? 'border-primary' : 'border-border'
      )}
    >
      {/* Node Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          🙋 询问用户
        </div>
        <div className="flex gap-1">
          {data.useAiSuggestions && (
            <div className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-semibold">
              AI
            </div>
          )}
          {data.multiSelect && (
            <div className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-semibold">
              多选
            </div>
          )}
        </div>
      </div>

      {/* Question Text */}
      <div className="text-[13px] text-foreground mb-3 font-medium">
        {data.questionText || '未设置问题'}
      </div>

      {/* Options List - only show when not using AI suggestions */}
      {!data.useAiSuggestions && data.options && data.options.length > 0 && (
        <div className="mb-2 space-y-1">
          {data.options.map((option) => (
            <div
              key={option.label}
              className="text-[11px] text-primary-foreground bg-primary/80 px-2 py-1 rounded"
            >
              {option.label}
            </div>
          ))}
        </div>
      )}

      {/* AI Suggestions Indicator */}
      {data.useAiSuggestions && (
        <div className="text-[11px] text-muted-foreground italic mb-2">
          选项由 AI 动态生成
        </div>
      )}

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-4 !h-4 !bg-primary !border-2 !border-background"
      />

      {/* Dynamic Output Handles */}
      {data.useAiSuggestions || data.multiSelect ? (
        /* AI suggestions or multi-select: single output handle */
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="!w-4 !h-4 !bg-primary !border-2 !border-background"
        />
      ) : (
        /* Single select with user-defined options: multiple output handles (2-4 branches) */
        data.options?.map((option, i) => (
          <Handle
            key={`branch-${option.label}`}
            type="source"
            position={Position.Right}
            id={`branch-${i}`}
            className="!w-4 !h-4 !bg-primary !border-2 !border-background"
            style={{
              top: `${((i + 1) / (data.options.length + 1)) * 100}%`,
            }}
          />
        ))
      )}
    </div>
  );
};

AskUserQuestionNode.displayName = 'AskUserQuestionNode';
