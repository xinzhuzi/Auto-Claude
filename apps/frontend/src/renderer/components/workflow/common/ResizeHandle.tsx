/**
 * Resize Handle Component
 * =======================
 *
 * Draggable handle for resizing panels and containers.
 */

import React from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  onMouseDown,
  orientation = 'vertical',
  className,
}) => {
  const isVertical = orientation === 'vertical';

  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        'group flex items-center justify-center bg-border hover:bg-primary/20 transition-colors',
        isVertical
          ? 'w-1 h-full cursor-ew-resize hover:w-1.5'
          : 'h-1 w-full cursor-ns-resize hover:h-1.5',
        className
      )}
    >
      <div
        className={cn(
          'opacity-0 group-hover:opacity-100 transition-opacity',
          isVertical ? 'rotate-0' : 'rotate-90'
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
};
