/**
 * NodeContextMenu Component
 *
 * Right-click context menu for adding nodes to the workflow canvas
 * Two-level menu: category -> nodes
 */

import React, { useState } from 'react';
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
  Terminal,
  ChevronRight,
  Layers,
  Cog,
  Route
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
}

interface Category {
  key: string;
  label: string;
  icon: React.ReactNode;
  nodes: NodeType[];
}

const categories: Category[] = [
  {
    key: 'basic',
    label: '基础节点',
    icon: <Layers className="h-4 w-4" />,
    nodes: [
      {
        type: 'start',
        label: '开始',
        icon: <Play className="h-4 w-4" />,
        description: '工作流的起点',
      },
      {
        type: 'end',
        label: '结束',
        icon: <Square className="h-4 w-4" />,
        description: '工作流的终点',
      },
      {
        type: 'prompt',
        label: '提示词',
        icon: <MessageSquare className="h-4 w-4" />,
        description: '发送提示词给 AI',
      },
    ],
  },
  {
    key: 'execution',
    label: '执行节点',
    icon: <Cog className="h-4 w-4" />,
    nodes: [
      {
        type: 'skill',
        label: '技能',
        icon: <Zap className="h-4 w-4" />,
        description: '执行预定义的技能',
      },
      {
        type: 'mcp',
        label: 'MCP 工具',
        icon: <Plug className="h-4 w-4" />,
        description: '调用 MCP 服务器工具',
      },
      {
        type: 'subAgent',
        label: '子代理',
        icon: <Bot className="h-4 w-4" />,
        description: '启动子代理执行任务',
      },
      {
        type: 'command',
        label: '快捷命令',
        icon: <Terminal className="h-4 w-4" />,
        description: '执行 slash 命令',
      },
    ],
  },
  {
    key: 'control',
    label: '流程控制',
    icon: <Route className="h-4 w-4" />,
    nodes: [
      {
        type: 'ifElse',
        label: '条件判断',
        icon: <GitBranch className="h-4 w-4" />,
        description: '根据条件选择分支',
      },
      {
        type: 'switch',
        label: '多路分支',
        icon: <GitMerge className="h-4 w-4" />,
        description: '多条件分支选择',
      },
      {
        type: 'askUserQuestion',
        label: '询问用户',
        icon: <HelpCircle className="h-4 w-4" />,
        description: '暂停并等待用户输入',
      },
    ],
  },
];

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  position,
  onSelect,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleSelect = (nodeType: string) => {
    onSelect(nodeType);
    onClose();
  };

  // Handle click outside to close
  React.useEffect(() => {
    const handleClickOutside = () => {
      onClose();
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  // Calculate submenu position
  const getSubmenuStyle = () => {
    const menuWidth = 180;
    const submenuWidth = 200;
    const windowWidth = window.innerWidth;

    // Check if submenu would overflow right edge
    if (position.x + menuWidth + submenuWidth > windowWidth) {
      return { right: '100%', left: 'auto', marginRight: '4px' };
    }
    return { left: '100%', right: 'auto', marginLeft: '4px' };
  };

  return (
    <div
      className="fixed z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[180px]"
      style={{
        left: position.x,
        top: position.y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {categories.map((category) => (
        <div
          key={category.key}
          className="relative"
          onMouseEnter={() => setActiveCategory(category.key)}
          onMouseLeave={() => setActiveCategory(null)}
        >
          {/* Category Item */}
          <button
            className={cn(
              'w-full px-3 py-2 flex items-center gap-3 text-left',
              'hover:bg-accent transition-colors',
              activeCategory === category.key && 'bg-accent'
            )}
          >
            <span className="text-primary">{category.icon}</span>
            <span className="flex-1 text-sm font-medium">{category.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Submenu */}
          {activeCategory === category.key && (
            <div
              className="absolute top-0 z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[200px]"
              style={getSubmenuStyle()}
            >
              {category.nodes.map((node) => (
                <button
                  key={node.type}
                  className={cn(
                    'w-full px-3 py-2 flex items-center gap-3 text-left',
                    'hover:bg-accent transition-colors'
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
          )}
        </div>
      ))}
    </div>
  );
};

NodeContextMenu.displayName = 'NodeContextMenu';
