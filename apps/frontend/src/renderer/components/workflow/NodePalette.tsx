/**
 * NodePalette Component
 *
 * Palette of draggable node types with categorization
 */

import React from 'react';
import {
  Play,
  Square,
  MessageSquare,
  Zap,
  Plug,
  GitBranch,
  GitMerge,
  HelpCircle,
  Bot
} from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

interface NodePaletteProps {
  className?: string;
}

interface NodeType {
  type: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  category: 'basic' | 'execution' | 'control';
}

const nodeTypes: NodeType[] = [
  // Basic Nodes
  {
    type: 'start',
    label: 'Start',
    icon: <Play className="h-5 w-5" />,
    description: 'Workflow entry point',
    category: 'basic',
  },
  {
    type: 'end',
    label: 'End',
    icon: <Square className="h-5 w-5" />,
    description: 'Workflow exit point',
    category: 'basic',
  },
  {
    type: 'prompt',
    label: 'Prompt',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Send prompt to Claude',
    category: 'basic',
  },

  // Execution Nodes
  {
    type: 'skill',
    label: 'Skill',
    icon: <Zap className="h-5 w-5" />,
    description: 'Execute Claude Skill',
    category: 'execution',
  },
  {
    type: 'mcp',
    label: 'MCP Tool',
    icon: <Plug className="h-5 w-5" />,
    description: 'Call MCP tool',
    category: 'execution',
  },
  {
    type: 'subAgent',
    label: 'Sub-Agent',
    icon: <Bot className="h-5 w-5" />,
    description: 'Delegate to sub-agent',
    category: 'execution',
  },

  // Control Flow Nodes
  {
    type: 'ifElse',
    label: 'If/Else',
    icon: <GitBranch className="h-5 w-5" />,
    description: 'Binary conditional branch',
    category: 'control',
  },
  {
    type: 'switch',
    label: 'Switch',
    icon: <GitMerge className="h-5 w-5" />,
    description: 'Multi-way branch',
    category: 'control',
  },
  {
    type: 'askUserQuestion',
    label: 'Ask User',
    icon: <HelpCircle className="h-5 w-5" />,
    description: 'Get user input at runtime',
    category: 'control',
  },
];

const categoryLabels = {
  basic: 'Basic Nodes',
  execution: 'Execution Nodes',
  control: 'Control Flow',
};

export const NodePalette: React.FC<NodePaletteProps> = ({ className }) => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Group nodes by category
  const groupedNodes = nodeTypes.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = [];
    }
    acc[node.category].push(node);
    return acc;
  }, {} as Record<string, NodeType[]>);

  return (
    <Card className={cn('w-64 p-4 overflow-y-auto border-r', className)}>
      <h3 className="font-semibold mb-4 text-lg">Node Palette</h3>

      <div className="space-y-6">
        {Object.entries(groupedNodes).map(([category, nodes]) => (
          <div key={category}>
            {/* Category Header */}
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {categoryLabels[category as keyof typeof categoryLabels]}
            </h4>

            {/* Nodes in Category */}
            <div className="space-y-2">
              {nodes.map((node) => (
                <div
                  key={node.type}
                  className={cn(
                    'group relative p-3 border-2 rounded-lg cursor-move',
                    'transition-all duration-200',
                    'hover:border-primary hover:bg-accent hover:shadow-md',
                    'active:scale-95'
                  )}
                  draggable
                  onDragStart={(e) => onDragStart(e, node.type)}
                  title={node.description}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 text-primary group-hover:scale-110 transition-transform">
                      {node.icon}
                    </div>

                    {/* Label and Description */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground mb-0.5">
                        {node.label}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {node.description}
                      </div>
                    </div>
                  </div>

                  {/* Drag Indicator */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col gap-0.5">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                      <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                      <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Tips */}
      <div className="mt-6 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          💡 <strong>Tip:</strong> Drag nodes onto the canvas to build your workflow
        </p>
      </div>
    </Card>
  );
};
