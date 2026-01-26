/**
 * NodePalette Component
 *
 * Draggable node palette for workflow editor
 * Displays all available node types organized by category
 */

import React, { useCallback } from 'react';
import { Card } from '@frontend/src/renderer/components/ui/card';
import { ScrollArea } from '@frontend/src/renderer/components/ui/scroll-area';
import { Badge } from '@frontend/src/renderer/components/ui/badge';
import { cn } from '@frontend/src/renderer/lib/utils';

interface NodeTemplate {
  type: string;
  label: string;
  icon: string;
  description: string;
  category: 'basic' | 'core' | 'conditional' | 'functional';
}

/**
 * Node type definitions
 * Organized by category for better UX
 */
const NODE_TEMPLATES: NodeTemplate[] = [
  // Basic nodes
  {
    type: 'start',
    label: 'Start',
    icon: '▶',
    description: 'Workflow entry point',
    category: 'basic',
  },
  {
    type: 'end',
    label: 'End',
    icon: '⏹',
    description: 'Workflow termination',
    category: 'basic',
  },

  // Core nodes
  {
    type: 'subAgent',
    label: 'SubAgent',
    icon: '🤖',
    description: 'AI agent execution',
    category: 'core',
  },
  {
    type: 'mcp',
    label: 'MCP Tool',
    icon: '🔌',
    description: 'MCP server tool call',
    category: 'core',
  },
  {
    type: 'prompt',
    label: 'Prompt',
    icon: '📝',
    description: 'Prompt template',
    category: 'core',
  },

  // Conditional nodes
  {
    type: 'ifElse',
    label: 'If/Else',
    icon: '🔀',
    description: '2-way conditional',
    category: 'conditional',
  },
  {
    type: 'switch',
    label: 'Switch',
    icon: '🔀',
    description: 'Multi-way branch',
    category: 'conditional',
  },
  {
    type: 'askUserQuestion',
    label: 'Ask User',
    icon: '❓',
    description: 'User interaction',
    category: 'conditional',
  },

  // Functional nodes
  {
    type: 'skill',
    label: 'Skill',
    icon: '⚡',
    description: 'Claude Code skill',
    category: 'functional',
  },
  {
    type: 'subAgentFlow',
    label: 'Sub-Agent Flow',
    icon: '🔄',
    description: 'Sub-workflow reference',
    category: 'functional',
  },
];

interface NodePaletteProps {
  className?: string;
}

/**
 * NodePalette Component
 */
const NodePalette: React.FC<NodePaletteProps> = ({ className }) => {
  /**
   * Handle drag start
   * Sets the node type in data transfer for ReactFlow to consume
   */
  const handleDragStart = useCallback(
    (event: React.DragEvent, nodeType: string) => {
      event.dataTransfer.setData('application/reactflow', nodeType);
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  /**
   * Render a single node template card
   */
  const NodeCard: React.FC<{ template: NodeTemplate }> = ({ template }) => (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border-2',
        'bg-background hover:bg-accent/50',
        'hover:border-primary cursor-grab active:cursor-grabbing',
        'transition-all duration-200'
      )}
      draggable
      onDragStart={(e) => handleDragStart(e, template.type)}
    >
      {/* Node icon */}
      <div className="text-2xl flex-shrink-0">{template.icon}</div>

      {/* Node info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{template.label}</div>
        <div className="text-xs text-muted-foreground truncate">
          {template.description}
        </div>
      </div>
    </div>
  );

  /**
   * Render node category section
   */
  const CategorySection: React.FC<{
    title: string;
    templates: NodeTemplate[];
  }> = ({ title, templates }) => (
    <div className="mb-6">
      <h3 className="text-sm font-semibold mb-3 px-1">{title}</h3>
      <div className="space-y-2">
        {templates.map((template) => (
          <NodeCard key={template.type} template={template} />
        ))}
      </div>
    </div>
  );

  // Group templates by category
  const basicNodes = NODE_TEMPLATES.filter((t) => t.category === 'basic');
  const coreNodes = NODE_TEMPLATES.filter((t) => t.category === 'core');
  const conditionalNodes = NODE_TEMPLATES.filter(
    (t) => t.category === 'conditional'
  );
  const functionalNodes = NODE_TEMPLATES.filter(
    (t) => t.category === 'functional'
  );

  return (
    <Card
      className={cn('w-72 h-full flex flex-col', className)}
      data-testid="node-palette"
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-lg">Node Palette</h2>
          <Badge variant="secondary" className="text-xs">
            {NODE_TEMPLATES.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Drag nodes to canvas to add them
        </p>
      </div>

      {/* Node list */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-6">
          <CategorySection title="Basic Nodes" templates={basicNodes} />
          <CategorySection title="Core Nodes" templates={coreNodes} />
          <CategorySection
            title="Conditional Nodes"
            templates={conditionalNodes}
          />
          <CategorySection
            title="Functional Nodes"
            templates={functionalNodes}
          />
        </div>
      </ScrollArea>
    </Card>
  );
};

export default NodePalette;
