import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { SortableTerminalTab } from './SortableTerminalTab';
import type { Terminal } from '../../stores/terminal-store';

interface TerminalTabBarProps {
  terminals: Terminal[];
  activeTerminalId: string | null;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabRename: (id: string, newName: string) => void;
  onNewTerminal: () => void;
  canAddTerminal: boolean;
}

export function TerminalTabBar({
  terminals,
  activeTerminalId,
  onTabChange,
  onTabClose,
  onTabRename,
  onNewTerminal,
  canAddTerminal,
}: TerminalTabBarProps) {
  const terminalIds = terminals.map(t => t.id);

  return (
    <div className="flex items-center border-b border-border bg-card/30 h-10 backdrop-blur-sm">
      {/* 左侧：横向滚动的标签页 */}
      <ScrollArea className="flex-1">
        <div className="flex items-center h-10">
          <SortableContext items={terminalIds} strategy={horizontalListSortingStrategy}>
            {terminals.map(terminal => (
              <SortableTerminalTab
                key={terminal.id}
                terminal={terminal}
                isActive={terminal.id === activeTerminalId}
                onSelect={() => onTabChange(terminal.id)}
                onClose={() => onTabClose(terminal.id)}
                onRename={(newName) => onTabRename(terminal.id, newName)}
              />
            ))}
          </SortableContext>
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>

      {/* 新建终端按钮 */}
      <div className="shrink-0 border-l border-border px-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-primary/10 transition-colors duration-150"
          onClick={onNewTerminal}
          disabled={!canAddTerminal}
          title="New Terminal (Ctrl+T)"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
