import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TerminalTab } from './TerminalTab';
import type { Terminal } from '../../stores/terminal-store';

interface SortableTerminalTabProps {
  terminal: Terminal;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onRename: (newName: string) => void;
}

export function SortableTerminalTab({
  terminal,
  isActive,
  onSelect,
  onClose,
  onRename,
}: SortableTerminalTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: terminal.id,
    data: {
      type: 'terminal-tab',
      terminalId: terminal.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TerminalTab
        terminal={terminal}
        isActive={isActive}
        onSelect={onSelect}
        onClose={onClose}
        onRename={onRename}
        dragHandleProps={listeners}
        isDragging={isDragging}
      />
    </div>
  );
}
