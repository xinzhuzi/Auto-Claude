/**
 * Tool Execution Indicator Component
 * ===================================
 *
 * Displays information about tool execution in chat messages.
 */

import React from 'react';
import { Badge } from '../../ui/badge';
import { Wrench, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ToolExecutionIndicatorProps {
  toolInfo: string;
  isExecuting?: boolean;
  className?: string;
}

export const ToolExecutionIndicator: React.FC<ToolExecutionIndicatorProps> = ({
  toolInfo,
  isExecuting = false,
  className,
}) => {
  // Parse tool info (format: "toolName" or "toolName: description")
  const [toolName, description] = toolInfo.includes(':')
    ? toolInfo.split(':').map((s) => s.trim())
    : [toolInfo, ''];

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border',
        className
      )}
    >
      {isExecuting ? (
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
      ) : (
        <Wrench className="h-3 w-3 text-muted-foreground" />
      )}

      <Badge variant="secondary" className="text-xs font-mono">
        {toolName}
      </Badge>

      {description && (
        <span className="text-xs text-muted-foreground">{description}</span>
      )}
    </div>
  );
};
