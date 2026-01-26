import { useState, useEffect, memo } from 'react';
import { Sparkles, GitBranch, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { Terminal } from '../../stores/terminal-store';

interface TerminalTabProps {
  terminal: Terminal;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onRename: (newName: string) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
}

export const TerminalTab = memo(function TerminalTab({
  terminal,
  isActive,
  onSelect,
  onClose,
  onRename,
  dragHandleProps,
  isDragging = false,
}: TerminalTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(terminal.title);

  // Sync editName when terminal.title changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditName(terminal.title);
    }
  }, [terminal.title, isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editName.trim() && editName !== terminal.title) {
      onRename(editName.trim());
    } else {
      setEditName(terminal.title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setEditName(terminal.title);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 border-r border-border cursor-pointer",
        "hover:bg-accent/50 transition-all duration-200 ease-in-out min-w-[120px] max-w-[200px]",
        "relative",
        isActive && "bg-background border-b-2 border-b-primary shadow-sm",
        isDragging && "opacity-50 scale-95"
      )}
      onClick={onSelect}
      {...dragHandleProps}
    >
      {/* Active indicator line */}
      {isActive && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary animate-in fade-in slide-in-from-bottom-1 duration-200" />
      )}

      {/* 状态指示器 */}
      <div className="flex items-center gap-1 shrink-0">
        {terminal.isClaudeMode && (
          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
        )}
        {terminal.worktreeConfig && (
          <GitBranch className="h-3 w-3 text-info" />
        )}
      </div>

      {/* 终端名称 - 可编辑 */}
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-1 animate-in fade-in duration-150"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 text-sm truncate transition-colors duration-150"
          onDoubleClick={handleDoubleClick}
          title={terminal.title}
        >
          {terminal.title}
        </span>
      )}

      {/* 关闭按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-4 w-4 p-0 shrink-0 hover:bg-destructive/20 transition-all duration-150",
          "opacity-0 group-hover:opacity-100",
          isActive && "opacity-60 group-hover:opacity-100"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
});
