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
  Bot,
  Terminal
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
    label: '开始',
    icon: <Play className="h-5 w-5" />,
    description: '工作流的起点',
    category: 'basic',
  },
  {
    type: 'end',
    label: '结束',
    icon: <Square className="h-5 w-5" />,
    description: '工作流的终点',
    category: 'basic',
  },
  {
    type: 'prompt',
    label: '提示词',
    icon: <MessageSquare className="h-5 w-5" />,
    description: '发送提示词给 AI',
    category: 'basic',
  },

  // Execution Nodes
  {
    type: 'skill',
    label: '技能',
    icon: <Zap className="h-5 w-5" />,
    description: '执行预定义的技能',
    category: 'execution',
  },
  {
    type: 'mcp',
    label: 'MCP 工具',
    icon: <Plug className="h-5 w-5" />,
    description: '调用 MCP 服务器工具',
    category: 'execution',
  },
  {
    type: 'subAgent',
    label: '子代理',
    icon: <Bot className="h-5 w-5" />,
    description: '启动子代理执行任务',
    category: 'execution',
  },
  {
    type: 'command',
    label: '快捷命令',
    icon: <Terminal className="h-5 w-5" />,
    description: '执行 slash 命令',
    category: 'execution',
  },

  // Control Flow Nodes
  {
    type: 'ifElse',
    label: '条件判断',
    icon: <GitBranch className="h-5 w-5" />,
    description: '根据条件选择分支',
    category: 'control',
  },
  {
    type: 'switch',
    label: '多路分支',
    icon: <GitMerge className="h-5 w-5" />,
    description: '多条件分支选择',
    category: 'control',
  },
  {
    type: 'askUserQuestion',
    label: '询问用户',
    icon: <HelpCircle className="h-5 w-5" />,
    description: '暂停并等待用户输入',
    category: 'control',
  },
];

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

  const categoryLabels = {
    basic: '基础节点',
    execution: '执行节点',
    control: '流程控制',
  };

  return (
    <Card className={cn('w-64 p-4 overflow-y-auto border-r', className)}>
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

      {/* Quick Tips - Removed */}
    </Card>
  );
};
