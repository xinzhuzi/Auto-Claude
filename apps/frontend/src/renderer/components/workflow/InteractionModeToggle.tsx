/**
 * Interaction Mode Toggle Component
 * ==================================
 *
 * Toggle between pan and selection modes for the workflow canvas.
 */

import React from 'react';
import { Button } from '../ui/button';
import { Hand, MousePointer2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type InteractionMode = 'pan' | 'selection';

interface InteractionModeToggleProps {
  mode: InteractionMode;
  onModeChange: (mode: InteractionMode) => void;
  className?: string;
}

export const InteractionModeToggle: React.FC<InteractionModeToggleProps> = ({
  mode,
  onModeChange,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-1 bg-background border rounded-md p-1', className)}>
      <Button
        variant={mode === 'selection' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('selection')}
        className="h-8 px-3 gap-2"
        title="Selection Mode (V)"
      >
        <MousePointer2 className="h-4 w-4" />
        <span className="text-xs">Select</span>
      </Button>
      <Button
        variant={mode === 'pan' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('pan')}
        className="h-8 px-3 gap-2"
        title="Pan Mode (H)"
      >
        <Hand className="h-4 w-4" />
        <span className="text-xs">Pan</span>
      </Button>
    </div>
  );
};
