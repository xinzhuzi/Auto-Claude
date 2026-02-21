/**
 * SubAgentFlow Dialog
 * ===================
 *
 * Simplified dialog for editing Sub-Agent Flows.
 * Provides a nested workflow editor within the main workflow.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Sparkles, Check, X, AlertCircle } from 'lucide-react';
import { WorkflowCanvas } from './WorkflowCanvas';
import { NodePalette } from './NodePalette';
import { PropertyPanel } from './PropertyPanel';
import { useWorkflowStore } from '../../stores/workflow-store';
import { cn } from '../../lib/utils';

interface SubAgentFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subAgentFlowId: string | null;
}

export const SubAgentFlowDialog: React.FC<SubAgentFlowDialogProps> = ({
  open,
  onOpenChange,
  subAgentFlowId,
}) => {
  const activeWorkflow = useWorkflowStore((state) => state.workflows.find(w => w.id === state.activeWorkflowId));
  const saveWorkflow = useWorkflowStore((state) => state.saveWorkflow);
  const [localName, setLocalName] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // SubAgentFlow name pattern validation (lowercase, numbers, hyphens, underscores)
  const SUBAGENTFLOW_NAME_PATTERN = /^[a-z0-9_-]+$/;

  // Find the SubAgentFlow node in the workflow
  const subAgentFlowNode = activeWorkflow?.nodes.find(
    (node) => node.type === 'subAgentFlow' && node.id === subAgentFlowId
  );

  // Initialize local state when dialog opens
  useEffect(() => {
    if (open && subAgentFlowNode) {
      const nodeData = subAgentFlowNode.data as { name?: string; description?: string };
      setLocalName(nodeData?.name || '');
      setLocalDescription(nodeData?.description || '');
      setNameError(null);
      setHasChanges(false);
    }
  }, [open, subAgentFlowNode]);

  // Handle name change with validation
  const handleNameChange = (value: string) => {
    setLocalName(value);
    setHasChanges(true);

    if (value.length === 0) {
      setNameError('Name is required');
    } else if (value.length > 50) {
      setNameError('Name is too long (max 50 characters)');
    } else if (!SUBAGENTFLOW_NAME_PATTERN.test(value)) {
      setNameError('Name must contain only lowercase letters, numbers, hyphens, and underscores');
    } else {
      setNameError(null);
    }
  };

  // Handle description change
  const handleDescriptionChange = (value: string) => {
    setLocalDescription(value);
    setHasChanges(true);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!activeWorkflow || !subAgentFlowNode || nameError) {
      return;
    }

    // Update the SubAgentFlow node with new name and description
    const updatedNodes = activeWorkflow.nodes.map((node) =>
      node.id === subAgentFlowId
        ? {
            ...node,
            data: {
              ...node.data,
              name: localName,
              description: localDescription,
            },
          }
        : node
    );

    const updatedWorkflow = {
      ...activeWorkflow,
      nodes: updatedNodes,
    } as any;

    await saveWorkflow(updatedWorkflow);
    onOpenChange(false);
  };

  // Handle cancel
  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    onOpenChange(false);
  };

  if (!subAgentFlowNode) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col p-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-purple-500/50 bg-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-purple-500 border-purple-500">
                Sub-Agent Flow
              </Badge>
              <div className="flex-1">
                <Label htmlFor="subagent-name" className="text-xs text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="subagent-name"
                  value={localName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="my-subagent-flow"
                  className={cn(
                    'h-8 font-mono text-sm',
                    nameError && 'border-destructive'
                  )}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!!nameError || !localName}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>

          {/* Name Error */}
          {nameError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{nameError}</AlertDescription>
            </Alert>
          )}

          {/* Description */}
          <div className="mt-3">
            <Label htmlFor="subagent-description" className="text-xs text-muted-foreground">
              Description
            </Label>
            <Input
              id="subagent-description"
              value={localDescription}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Describe what this sub-agent flow does..."
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex gap-4 p-4 min-h-0">
          {/* Node Palette */}
          <div className="w-64 flex-shrink-0">
            <NodePalette />
          </div>

          {/* Workflow Canvas */}
          <div className="flex-1 border rounded-lg overflow-hidden bg-background">
            <WorkflowCanvas />
          </div>

          {/* Property Panel */}
          <div className="w-80 flex-shrink-0">
            <PropertyPanel />
          </div>
        </div>

        {/* Info Footer */}
        <div className="px-6 py-3 border-t bg-muted/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            <span>
              Sub-Agent Flows allow you to create reusable workflow components that can be
              called from the main workflow.
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
