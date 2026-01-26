/**
 * Copilot Execution Mode Dropdown Component
 * ==========================================
 *
 * Dropdown for selecting copilot execution mode (VSCode/CLI).
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
import { ChevronDown, Code, Terminal } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type CopilotExecutionMode = 'vscode' | 'cli';

interface CopilotExecutionModeDropdownProps {
  value: CopilotExecutionMode;
  onChange: (mode: CopilotExecutionMode) => void;
  disabled?: boolean;
  className?: string;
}

const EXECUTION_MODES = [
  {
    value: 'vscode' as const,
    label: 'VSCode Extension',
    description: 'Run as VSCode extension',
    icon: Code,
  },
  {
    value: 'cli' as const,
    label: 'CLI Mode',
    description: 'Run as command-line tool',
    icon: Terminal,
  },
];

export const CopilotExecutionModeDropdown: React.FC<CopilotExecutionModeDropdownProps> = ({
  value,
  onChange,
  disabled = false,
  className,
}) => {
  const currentMode = EXECUTION_MODES.find((mode) => mode.value === value);
  const Icon = currentMode?.icon || Code;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn('gap-2', className)}
        >
          <Icon className="h-4 w-4" />
          <span>{currentMode?.label || 'Select Mode'}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Execution Mode</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {EXECUTION_MODES.map((mode) => {
          const ModeIcon = mode.icon;
          return (
            <DropdownMenuItem
              key={mode.value}
              onClick={() => onChange(mode.value)}
              className={cn(
                'flex flex-col items-start gap-1',
                value === mode.value && 'bg-accent'
              )}
            >
              <div className="flex items-center gap-2">
                <ModeIcon className="h-4 w-4" />
                <span className="font-medium">{mode.label}</span>
                {value === mode.value && (
                  <span className="ml-auto text-xs">✓</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {mode.description}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
