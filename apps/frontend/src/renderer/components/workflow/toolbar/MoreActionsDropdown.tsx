/**
 * More Actions Dropdown Component
 * ================================
 *
 * Dropdown menu for additional workflow actions.
 */

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Button } from '../../ui/button';
import { MoreVertical, RotateCcw, HelpCircle, Maximize2, Minimize2, FilePlus } from 'lucide-react';

interface MoreActionsDropdownProps {
  onNewWorkflow?: () => void;
  onReset?: () => void;
  onStartTour?: () => void;
  onToggleFocusMode?: () => void;
  isFocusMode?: boolean;
  disabled?: boolean;
}

export const MoreActionsDropdown: React.FC<MoreActionsDropdownProps> = ({
  onNewWorkflow,
  onReset,
  onStartTour,
  onToggleFocusMode,
  isFocusMode = false,
  disabled = false,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>More Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* New Workflow */}
        {onNewWorkflow && (
          <DropdownMenuItem onClick={onNewWorkflow}>
            <FilePlus className="mr-2 h-4 w-4" />
            <span>New Workflow</span>
          </DropdownMenuItem>
        )}

        {/* Start Tour */}
        {onStartTour && (
          <DropdownMenuItem onClick={onStartTour}>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Start Tour</span>
          </DropdownMenuItem>
        )}

        {/* Toggle Focus Mode */}
        {onToggleFocusMode && (
          <DropdownMenuItem onClick={onToggleFocusMode}>
            {isFocusMode ? (
              <>
                <Minimize2 className="mr-2 h-4 w-4" />
                <span>Exit Focus Mode</span>
              </>
            ) : (
              <>
                <Maximize2 className="mr-2 h-4 w-4" />
                <span>Enter Focus Mode</span>
              </>
            )}
          </DropdownMenuItem>
        )}

        {/* Reset Workflow */}
        {onReset && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onReset}
              className="text-destructive focus:text-destructive"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              <span>Reset Workflow</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
