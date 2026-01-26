/**
 * Toolbar Component (Simplified for Build)
 * ==========================================
 *
 * Simplified toolbar for workflow studio - basic version for successful build.
 */

import React from 'react';
import { Button } from '../ui/button';
import { Save, FolderOpen, Download, Play, Sparkles, MoreHorizontal } from 'lucide-react';

interface ToolbarProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  onSave: () => Promise<void>;
  onLoad: () => Promise<void>;
  onExport: () => Promise<void>;
  onRun: () => Promise<void>;
  onAiRefine?: () => void;
  onStartTour?: () => void;
  className?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  workflowName,
  onSave,
  onLoad,
  onExport,
  onRun,
  onAiRefine,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 p-2 border-b bg-background ${className}`}>
      {/* Workflow Name */}
      <div className="flex-1 px-2 font-medium text-sm">
        {workflowName}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={onSave}>
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onLoad}>
          <FolderOpen className="h-4 w-4 mr-1" />
          Load
        </Button>
        <Button size="sm" variant="ghost" onClick={onExport}>
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>

      {/* Run Button */}
      <Button size="sm" onClick={onRun}>
        <Play className="h-4 w-4 mr-1" />
        Run
      </Button>

      {/* AI Refine */}
      {onAiRefine && (
        <Button size="sm" variant="outline" onClick={onAiRefine}>
          <Sparkles className="h-4 w-4 mr-1" />
          AI Refine
        </Button>
      )}

      {/* More Actions */}
      <Button size="sm" variant="ghost">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
};
