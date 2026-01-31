/**
 * NodeContextMenu Component
 *
 * Right-click context menu for adding nodes to the workflow canvas
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
import { cn } from '../../lib/utils';

interface NodeContextMenuProps {
  position: { x: number; y: number };
  onSelect: (nodeType: string) => void;
  onClose: () => void;
}

interface NodeType {
  type: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  category: 'basic' | 'execution' | 'control';
}

const nodeTypes: NodeType[] = [
  // 基础节点
  {
    type: 'start',
    label: '开始',
    icon: <Play className="h-4 w-4" />,
    description: '工作流的起点',
    category: 'basic',
  },
  {
    type: 'end',
    label: '结束',
    icon: <Square className="h-4 w-4" />,
    description: '工作流的终点',
    category: 'basic',
  },
  {
    type: 'prompt',
    label: '提示词',
    icon: <MessageSquare className="h-4 w-4" />,
    description: '发送提示词给 AI',
    category: 'basic',
  },

  // 执行节点
  {
    type: 'skill',
    label: '技能',
    icon: <Zap className="h-4 w-4" />,
    description: '执行预定义的技能',
    category: 'execution',
  },
  {
    type: 'mcp',
    label: 'MCP 工具',
    icon: <Plug className="h-4 w-4" />,
    description: '调用 MCP 服务器工具',
    category: 'execution',
  },
  {
    type: 'subAgent',
    label: '子代理',
    icon: <Bot className="h-4 w-4" />,
    description: '启动子代理执行任务',
    category: 'execution',
  },
  {
    type: 'command',
    label: '快捷命令',
    icon: <Terminal className="h-4 w-4" />,
    description: '执行 slash 命令',
    category: 'execution',
  },

  // 流程控制
  {
    type: 'ifElse',
    label: '条件判断',
    icon: <GitBranch className="h-4 w-4" />,
    description: '根据条件选择分支',
    category: 'control',
  },
  {
    type: 'switch',
    label: '多路分支',
    icon: <GitMerge className="h-4 w-4" />,
    description: '多条件分支选择',
    category: 'control',
  },
  {
    type: 'askUserQuestion',
    label: '询问用户',
    icon: <HelpCircle className="h-4 w-4" />,
    description: '暂停并等待用户输入',
    category: 'control',
  },
];

const categoryLabels = {
  basic: '基础节点',
  execution: '执行节点',
  control: '流程控制',
};

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  position,
  onSelect,
  onClose,
}) => {
  // Group nodes by category
  const groupedNodes = nodeTypes.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = [];
    }
    acc[node.category].push(node);
    return acc;
  }, {} as Record<string, NodeType[]>);

  const handleSelect = (nodeType: string) => {
    onSelect(nodeType);
    onClose();
  };

  // Handle click outside to close
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      onClose();
    };

    // Add listener with a small delay to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      className="fixed z-50 bg-popover border rounded-lg shadow-lg py-2 min-w-[200px] max-h-[400px] overflow-y-auto"
      style={{
        left: position.x,
        top: position.y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {Object.entries(groupedNodes).map(([category, nodes], categoryIndex) => (
        <div key={category}>
          {categoryIndex > 0 && <div className="border-t my-1" />}

          {/* Category Header */}
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {categoryLabels[category as keyof typeof categoryLabels]}
          </div>

          {/* Nodes in Category */}
          {nodes.map((node) => (
            <button
              key={node.type}
              className={cn(
                'w-full px-3 py-2 flex items-center gap-3 text-left',
                'hover:bg-accent transition-colors',
                'focus:outline-none focus:bg-accent'
              )}
              onClick={() => handleSelect(node.type)}
            >
              <span className="text-primary">{node.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{node.label}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {node.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

NodeContextMenu.displayName = 'NodeContextMenu';
