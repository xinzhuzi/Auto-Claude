/**
 * Tool Select Tag Input Component
 * ================================
 *
 * Specialized tag input for selecting Claude Code tools.
 */

import React from 'react';
import { TagInput } from './TagInput';
import { Badge } from '../../ui/badge';
import { Wrench } from 'lucide-react';

interface ToolSelectTagInputProps {
  selectedTools: string[];
  onChange: (tools: string[]) => void;
  availableTools?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Bash',
  'Glob',
  'Grep',
  'Task',
  'AskUserQuestion',
  'EnterPlanMode',
  'ExitPlanMode',
];

export const ToolSelectTagInput: React.FC<ToolSelectTagInputProps> = ({
  selectedTools,
  onChange,
  availableTools = DEFAULT_TOOLS,
  placeholder = 'Add tool...',
  disabled = false,
  className,
}) => {
  return (
    <div className={className}>
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Allowed Tools</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Select which tools this node can use. Leave empty to allow all tools.
        </p>
      </div>

      <TagInput
        tags={selectedTools}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />

      {availableTools.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">Available tools:</p>
          <div className="flex flex-wrap gap-1.5">
            {availableTools.map((tool) => (
              <Badge
                key={tool}
                variant={selectedTools.includes(tool) ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => {
                  if (selectedTools.includes(tool)) {
                    onChange(selectedTools.filter((t) => t !== tool));
                  } else {
                    onChange([...selectedTools, tool]);
                  }
                }}
              >
                {tool}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
