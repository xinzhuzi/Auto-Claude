/**
 * SubAgentNode Component
 *
 * Custom React Flow node for Sub-Agent delegation.
 * Adapted from cc-wf-studio for Auto-Claude.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Handle, type NodeProps, Position } from 'reactflow';
import { cn } from '../../../lib/utils';

export interface SubAgentData {
  description: string;
  prompt?: string;
  model?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink';
  agentId?: string;
  icon?: string;
}

// Color mapping for sub-agent badges
const SUB_AGENT_COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
};

/**
 * SubAgentNode Component
 */
export const SubAgentNode: React.FC<NodeProps<SubAgentData>> = ({
  id,
  data,
  selected,
}) => {
  const { t } = useTranslation('workflowStudio');

  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 bg-background min-w-[200px] max-w-[300px]',
        selected ? 'border-primary' : 'border-border'
      )}
    >
      {/* Node Header */}
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {data.icon && <span className="text-sm normal-case">{data.icon}</span>}
        <span>{t('nodes.subAgent.label')}</span>
      </div>

      {/* Node Description */}
      <div className="text-[13px] text-foreground mb-2 font-medium">
        {data.description || t('newSubAgent')}
      </div>

      {/* Agent ID */}
      {data.agentId && (
        <div className="text-[10px] text-muted-foreground mb-2">
          {data.agentId}
        </div>
      )}

      {/* Prompt Preview */}
      {data.prompt && (
        <div className="text-[11px] text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
          {data.prompt}
        </div>
      )}

      {/* Badges */}
      <div className="flex gap-1 flex-wrap">
        {/* Model Badge */}
        {data.model && (
          <div className="text-[10px] text-primary-foreground bg-primary/80 px-1.5 py-0.5 rounded inline-block">
            {data.model}
          </div>
        )}

        {/* Color Badge */}
        {data.color && (
          <div
            className="text-[10px] text-white px-1.5 py-0.5 rounded inline-block capitalize"
            style={{
              backgroundColor: SUB_AGENT_COLORS[data.color],
            }}
          >
            {data.color}
          </div>
        )}
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-4 !h-4 !bg-primary !border-2 !border-background"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-4 !h-4 !bg-primary !border-2 !border-background"
      />
    </div>
  );
};

SubAgentNode.displayName = 'SubAgentNode';
