/**
 * SkillNode Component
 *
 * Custom React Flow node for Claude Skills.
 * Adapted from cc-wf-studio for Auto-Claude.
 */

import React, { useState, useCallback } from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { SkillBrowserDialog } from '../SkillBrowserDialog';
import { useWorkflowStore } from '../../../stores/workflow-store';

export interface SkillNodeData {
  name: string;
  description?: string;
  skillPath?: string;
  scope: 'user' | 'local' | 'project';
  allowedTools?: string;
  validationStatus: 'valid' | 'missing' | 'invalid';
  source?: string;
}

/**
 * Get validation status icon
 */
function getValidationIcon(status: 'valid' | 'missing' | 'invalid') {
  switch (status) {
    case 'valid':
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    case 'missing':
      return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    case 'invalid':
      return <XCircle className="h-3 w-3 text-red-500" />;
  }
}

/**
 * Get validation tooltip message
 */
function getValidationTooltip(status: 'valid' | 'missing' | 'invalid'): string {
  switch (status) {
    case 'valid':
      return 'Skill is valid and ready to use';
    case 'missing':
      return 'Skill not found';
    case 'invalid':
      return 'Skill configuration is invalid';
  }
}

/**
 * SkillNode Component
 */
export const SkillNode: React.FC<NodeProps<SkillNodeData>> = ({
  id,
  data,
  selected,
}) => {
  const [isSkillBrowserOpen, setIsSkillBrowserOpen] = useState(false);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  // Handle double click to open skill browser
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSkillBrowserOpen(true);
  }, []);

  // Handle skill selection from browser
  const handleSkillSelect = useCallback((skill: any) => {
    // Update the node data with the selected skill
    updateNodeData(id, {
      name: skill.name,
      description: skill.description,
      skillPath: skill.skillPath,
      scope: skill.scope,
      validationStatus: skill.validationStatus,
      allowedTools: skill.allowedTools,
      source: skill.source,
    });

    setIsSkillBrowserOpen(false);
  }, [id, updateNodeData]);

  return (
    <>
      <div
        className={cn(
          'relative p-3 rounded-lg border-2 bg-background min-w-[200px] max-w-[300px] cursor-pointer',
          selected ? 'border-primary' : 'border-border'
        )}
        onDoubleClick={handleDoubleClick}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Skill
          </div>
          <div title={getValidationTooltip(data.validationStatus)}>
            {getValidationIcon(data.validationStatus)}
          </div>
        </div>

        <div className="text-[13px] text-foreground mb-2 font-medium">
          {data.name || 'Untitled Skill'}
        </div>

        {data.description && (
          <div className="text-[11px] text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
            {data.description}
          </div>
        )}

        <div
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded inline-block uppercase font-semibold tracking-wide',
            data.scope === 'user' && 'bg-primary/80 text-primary-foreground',
            data.scope === 'local' && 'bg-blue-500/80 text-white',
            data.scope === 'project' && 'bg-secondary text-secondary-foreground'
          )}
        >
          {data.scope}
        </div>

        {data.allowedTools && (
          <div
            className="text-[9px] text-muted-foreground mt-1 truncate"
            title={`Allowed Tools: ${data.allowedTools}`}
          >
            🔧 {data.allowedTools}
          </div>
        )}

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
      </div>

      <SkillBrowserDialog
        open={isSkillBrowserOpen}
        onOpenChange={setIsSkillBrowserOpen}
        onSelectSkill={handleSkillSelect}
      />
    </>
  );
};

SkillNode.displayName = 'SkillNode';
