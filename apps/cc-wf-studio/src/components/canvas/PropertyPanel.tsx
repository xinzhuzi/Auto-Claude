/**
 * PropertyPanel Component
 *
 * Dynamic property editor for selected workflow nodes
 * Displays different forms based on node type
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@frontend/src/renderer/components/ui/card';
import { ScrollArea } from '@frontend/src/renderer/components/ui/scroll-area';
import { Input } from '@frontend/src/renderer/components/ui/input';
import { Textarea } from '@frontend/src/renderer/components/ui/textarea';
import { Label } from '@frontend/src/renderer/components/ui/label';
import { Button } from '@frontend/src/renderer/components/ui/button';
import { Badge } from '@frontend/src/renderer/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@frontend/src/renderer/components/ui/select';
import { cn } from '@frontend/src/renderer/lib/utils';
import type { Node } from 'reactflow';

import { useCanvasStore } from '@frontend/src/renderer/stores/canvas-store';
import { useWorkflowStore } from '@frontend/src/renderer/stores/workflow-store';
import type {
  StartNodeData,
  EndNodeData,
  SubAgentNodeData,
  McpNodeData,
  PromptNodeData,
  SkillNodeData,
} from '@shared/types/workflow';

interface PropertyPanelProps {
  className?: string;
}

/**
 * PropertyPanel Component
 */
const PropertyPanel: React.FC<PropertyPanelProps> = ({ className }) => {
  const { selectedNodes, updateNode } = useCanvasStore();
  const { activeWorkflow } = useWorkflowStore();

  // Get first selected node (single selection for now)
  const selectedNodeId = useMemo(() => {
    if (selectedNodes.size === 0) return null;
    return Array.from(selectedNodes)[0];
  }, [selectedNodes]);

  // Get selected node data
  const selectedNode = useMemo(() => {
    if (!activeWorkflow || !selectedNodeId) return null;
    return activeWorkflow.nodes?.find((n) => n.id === selectedNodeId) || null;
  }, [activeWorkflow, selectedNodeId]);

  // Local state for form data
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Sync selected node data to form
  useEffect(() => {
    if (selectedNode) {
      setFormData(selectedNode.data || {});
    }
  }, [selectedNode]);

  /**
   * Handle form field change
   */
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Update node in store
    if (selectedNodeId) {
      updateNode(selectedNodeId, {
        data: {
          ...formData,
          [field]: value,
        },
      });
    }
  };

  /**
   * Render empty state
   */
  if (!selectedNode) {
    return (
      <Card
        className={cn('w-80 h-full flex flex-col', className)}
        data-testid="property-panel"
      >
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Properties</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <p className="text-sm mb-2">No node selected</p>
            <p className="text-xs">
              Select a node to view and edit its properties
            </p>
          </div>
        </div>
      </Card>
    );
  }

  /**
   * Render Start node properties
   */
  if (selectedNode.type === 'start') {
    const data = formData as StartNodeData;
    return (
      <Card className={cn('w-80 h-full flex flex-col', className)}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-lg">Properties</h2>
            <Badge variant="outline" className="text-xs">
              Start Node
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={data.label || ''}
                onChange={(e) => handleFieldChange('label', e.target.value)}
                placeholder="Start"
              />
            </div>
          </div>
        </ScrollArea>
      </Card>
    );
  }

  /**
   * Render End node properties
   */
  if (selectedNode.type === 'end') {
    const data = formData as EndNodeData;
    return (
      <Card className={cn('w-80 h-full flex flex-col', className)}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-lg">Properties</h2>
            <Badge variant="outline" className="text-xs">
              End Node
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={data.label || ''}
                onChange={(e) => handleFieldChange('label', e.target.value)}
                placeholder="End"
              />
            </div>
          </div>
        </ScrollArea>
      </Card>
    );
  }

  /**
   * Render SubAgent node properties
   */
  if (selectedNode.type === 'subAgent') {
    const data = formData as SubAgentNodeData;
    return (
      <Card className={cn('w-80 h-full flex flex-col', className)}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-lg">Properties</h2>
            <Badge variant="outline" className="text-xs">
              SubAgent Node
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={data.label || ''}
                onChange={(e) => handleFieldChange('label', e.target.value)}
                placeholder="SubAgent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={data.description || ''}
                onChange={(e) =>
                  handleFieldChange('description', e.target.value)
                }
                placeholder="Agent description..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">System Prompt</Label>
              <Textarea
                id="prompt"
                value={data.prompt || ''}
                onChange={(e) => handleFieldChange('prompt', e.target.value)}
                placeholder="System prompt for the agent..."
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select
                value={data.model || 'claude-sonnet-4-5-20250929'}
                onValueChange={(value) => handleFieldChange('model', value)}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-sonnet-4-5-20250929">
                    Claude Sonnet 4.5
                  </SelectItem>
                  <SelectItem value="claude-opus-4-5-20251101">
                    Claude Opus 4.5
                  </SelectItem>
                  <SelectItem value="claude-haiku-4-5-20250929">
                    Claude Haiku 4.5
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>
      </Card>
    );
  }

  /**
   * Render MCP node properties
   */
  if (selectedNode.type === 'mcp') {
    const data = formData as McpNodeData;
    return (
      <Card className={cn('w-80 h-full flex flex-col', className)}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-lg">Properties</h2>
            <Badge variant="outline" className="text-xs">
              MCP Node
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            {/* Mode selection */}
            <div className="space-y-2">
              <Label htmlFor="mode">Configuration Mode</Label>
              <Select
                value={data.mode || 'manualParameterConfig'}
                onValueChange={(value) => handleFieldChange('mode', value)}
              >
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manualParameterConfig">
                    Manual Parameter Config
                  </SelectItem>
                  <SelectItem value="aiParameterConfig">
                    AI Parameter Config
                  </SelectItem>
                  <SelectItem value="aiToolSelection">
                    AI Tool Selection
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* MCP server selection */}
            <div className="space-y-2">
              <Label htmlFor="server">MCP Server</Label>
              <Input
                id="server"
                value={data.serverId || ''}
                onChange={(e) => handleFieldChange('serverId', e.target.value)}
                placeholder="server-name"
              />
            </div>

            {/* Tool name (for manual/ai parameter modes) */}
            {(data.mode === 'manualParameterConfig' ||
              data.mode === 'aiParameterConfig') && (
              <div className="space-y-2">
                <Label htmlFor="tool">Tool Name</Label>
                <Input
                  id="tool"
                  value={data.toolName || ''}
                  onChange={(e) => handleFieldChange('toolName', e.target.value)}
                  placeholder="tool-name"
                />
              </div>
            )}

            {/* Natural language description (for AI modes) */}
            {(data.mode === 'aiParameterConfig' ||
              data.mode === 'aiToolSelection') && (
              <div className="space-y-2">
                <Label htmlFor="description">
                  {data.mode === 'aiParameterConfig'
                    ? 'Parameter Description'
                    : 'Task Description'}
                </Label>
                <Textarea
                  id="description"
                  value={data.description || ''}
                  onChange={(e) =>
                    handleFieldChange('description', e.target.value)
                  }
                  placeholder={
                    data.mode === 'aiParameterConfig'
                      ? 'Describe what you want to do...'
                      : 'Describe the task...'
                  }
                  rows={4}
                />
              </div>
            )}

            {/* Validation status */}
            {data.validationStatus && data.validationStatus !== 'valid' && (
              <div
                className={cn(
                  'p-3 rounded-md text-sm',
                  data.validationStatus === 'missing' &&
                    'bg-yellow-500/10 text-yellow-600',
                  data.validationStatus === 'invalid' &&
                    'bg-red-500/10 text-red-600'
                )}
              >
                {data.validationStatus === 'missing' && '⚠ Tool not found'}
                {data.validationStatus === 'invalid' && '✗ Invalid configuration'}
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    );
  }

  /**
   * Render Prompt node properties
   */
  if (selectedNode.type === 'prompt') {
    const data = formData as PromptNodeData;
    return (
      <Card className={cn('w-80 h-full flex flex-col', className)}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-lg">Properties</h2>
            <Badge variant="outline" className="text-xs">
              Prompt Node
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={data.label || ''}
                onChange={(e) => handleFieldChange('label', e.target.value)}
                placeholder="Prompt"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt Template</Label>
              <Textarea
                id="prompt"
                value={data.prompt || ''}
                onChange={(e) => handleFieldChange('prompt', e.target.value)}
                placeholder="Your prompt template here... Use {{variable}} for dynamic values"
                rows={8}
              />
            </div>

            {/* Variable count badge */}
            {data.variableCount !== undefined && data.variableCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {data.variableCount} variables
                </Badge>
                <span>detected in template</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    );
  }

  /**
   * Render Skill node properties
   */
  if (selectedNode.type === 'skill') {
    const data = formData as SkillNodeData;
    return (
      <Card className={cn('w-80 h-full flex flex-col', className)}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-lg">Properties</h2>
            <Badge variant="outline" className="text-xs">
              Skill Node
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            {/* Validation status */}
            {data.validationStatus && (
              <div
                className={cn(
                  'p-3 rounded-md text-sm',
                  data.validationStatus === 'valid' &&
                    'bg-green-500/10 text-green-600',
                  data.validationStatus === 'missing' &&
                    'bg-yellow-500/10 text-yellow-600',
                  data.validationStatus === 'invalid' &&
                    'bg-red-500/10 text-red-600'
                )}
              >
                {data.validationStatus === 'valid' && '✓ Skill found'}
                {data.validationStatus === 'missing' && '⚠ Skill not found'}
                {data.validationStatus === 'invalid' && '✗ Invalid skill'}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="skillName">Skill Name</Label>
              <Input
                id="skillName"
                value={data.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="my-skill"
              />
            </div>

            {data.description && (
              <div className="text-sm text-muted-foreground">
                {data.description}
              </div>
            )}

            {data.scope && (
              <Badge variant="secondary" className="w-fit capitalize">
                {data.scope}
              </Badge>
            )}
          </div>
        </ScrollArea>
      </Card>
    );
  }

  /**
   * Fallback: Unsupported node type
   */
  return (
    <Card className={cn('w-80 h-full flex flex-col', className)}>
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-semibold text-lg">Properties</h2>
          <Badge variant="outline" className="text-xs">
            {selectedNode.type}
          </Badge>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground text-center">
          Properties for this node type are not yet implemented.
        </p>
      </div>
    </Card>
  );
};

export default PropertyPanel;
