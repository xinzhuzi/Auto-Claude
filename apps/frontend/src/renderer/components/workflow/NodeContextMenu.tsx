/**
 * NodeContextMenu Component
 *
 * Right-click context menu for adding nodes to the workflow canvas
 * Two-level menu: category -> nodes
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  labelKey: string;
  icon: React.ReactNode;
  descKey: string;
}

interface Category {
  key: string;
  labelKey: string;
  icon: React.ReactNode;
  nodes: NodeType[];
}

const categoriesConfig: Category[] = [
  {
    key: 'basic',
    labelKey: 'basicNodes',
    icon: <Layers className="h-4 w-4" />,
    nodes: [
      {
        type: 'start',
        labelKey: 'nodes.start.label',
        icon: <Play className="h-4 w-4" />,
        descKey: 'nodes.start.description',
      },
      {
        type: 'end',
        labelKey: 'nodes.end.label',
        icon: <Square className="h-4 w-4" />,
        descKey: 'nodes.end.description',
      },
      {
        type: 'prompt',
        labelKey: 'nodes.prompt.label',
        icon: <MessageSquare className="h-4 w-4" />,
        descKey: 'nodes.prompt.description',
      },
    ],
  },
  {
    key: 'execution',
    labelKey: 'executionNodes',
    icon: <Cog className="h-4 w-4" />,
    nodes: [
      {
        type: 'skill',
        labelKey: 'nodes.skill.label',
        icon: <Zap className="h-4 w-4" />,
        descKey: 'nodes.skill.description',
      },
      {
        type: 'mcp',
        labelKey: 'nodes.mcp.label',
        icon: <Plug className="h-4 w-4" />,
        descKey: 'nodes.mcp.description',
      },
      {
        type: 'subAgent',
        labelKey: 'nodes.subAgent.label',
        icon: <Bot className="h-4 w-4" />,
        descKey: 'nodes.subAgent.description',
      },
      {
        type: 'command',
        labelKey: 'nodes.command.label',
        icon: <Terminal className="h-4 w-4" />,
        descKey: 'nodes.command.description',
      },
    ],
  },
  {
    key: 'control',
    labelKey: 'controlFlow',
    icon: <Route className="h-4 w-4" />,
    nodes: [
      {
        type: 'ifElse',
        labelKey: 'nodes.ifElse.label',
        icon: <GitBranch className="h-4 w-4" />,
        descKey: 'nodes.ifElse.description',
      },
      {
        type: 'switch',
        labelKey: 'nodes.switch.label',
        icon: <GitMerge className="h-4 w-4" />,
        descKey: 'nodes.switch.description',
      },
      {
        type: 'askUserQuestion',
        labelKey: 'nodes.askUser.label',
        icon: <HelpCircle className="h-4 w-4" />,
        descKey: 'nodes.askUser.description',
      },
    ],
  },
];

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  position,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation('workflowStudio');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleSelect = (nodeType: string) => {
    onSelect(nodeType);
    onClose();
  };

  // Toggle category on click
  const handleCategoryClick = (categoryKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCategory(prev => prev === categoryKey ? null : categoryKey);
  };

  // Handle click outside to close
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside the menu
      if (target.closest('.node-context-menu')) {
        return;
      }
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
      className="node-context-menu fixed z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[180px]"
      style={{
        left: position.x,
        top: position.y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {categoriesConfig.map((category) => (
        <div
          key={category.key}
          className="relative"
        >
          {/* Category Item - Click to toggle */}
          <button
            className={cn(
              'w-full px-3 py-2 flex items-center gap-3 text-left',
              'hover:bg-accent transition-colors',
              activeCategory === category.key && 'bg-accent'
            )}
            onClick={(e) => handleCategoryClick(category.key, e)}
          >
            <span className="text-primary">{category.icon}</span>
            <span className="flex-1 text-sm font-medium">{t(category.labelKey)}</span>
            <ChevronRight className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              activeCategory === category.key && "rotate-90"
            )} />
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
                    <div className="text-sm font-medium">{t(node.labelKey)}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t(node.descKey)}
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
