/**
 * Slash Command Options Dropdown Component
 * =========================================
 *
 * Dropdown for configuring slash command options.
 */

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../../ui/dropdown-menu';
import { Button } from '../../ui/button';
import { Settings2, FileText, Cpu, Wrench, Zap } from 'lucide-react';
import { Badge } from '../../ui/badge';

export interface SlashCommandOptions {
  context?: string[];
  model?: string;
  hooks?: string[];
  allowedTools?: string[];
  disableModelInvocation?: boolean;
  argumentHints?: Record<string, string>;
}

interface SlashCommandOptionsDropdownProps {
  options: SlashCommandOptions;
  onChange: (options: SlashCommandOptions) => void;
  disabled?: boolean;
}

const AVAILABLE_MODELS = [
  { value: 'sonnet', label: 'Claude Sonnet 4.5' },
  { value: 'opus', label: 'Claude Opus 4.5' },
  { value: 'haiku', label: 'Claude Haiku 3.5' },
];

export const SlashCommandOptionsDropdown: React.FC<SlashCommandOptionsDropdownProps> = ({
  options,
  onChange,
  disabled = false,
}) => {
  const handleModelChange = (model: string) => {
    onChange({ ...options, model });
  };

  const toggleDisableModelInvocation = () => {
    onChange({
      ...options,
      disableModelInvocation: !options.disableModelInvocation,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span>Options</span>
          {Object.keys(options).length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
              {Object.keys(options).length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Slash Command Options</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Model Selection */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Cpu className="mr-2 h-4 w-4" />
            <span>Model</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {AVAILABLE_MODELS.map((model) => (
              <DropdownMenuItem
                key={model.value}
                onClick={() => handleModelChange(model.value)}
                className={options.model === model.value ? 'bg-accent' : ''}
              >
                {model.label}
                {options.model === model.value && (
                  <span className="ml-auto text-xs">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Context Files */}
        <DropdownMenuItem disabled>
          <FileText className="mr-2 h-4 w-4" />
          <span>Context Files</span>
          {options.context && options.context.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {options.context.length}
            </Badge>
          )}
        </DropdownMenuItem>

        {/* Hooks */}
        <DropdownMenuItem disabled>
          <Zap className="mr-2 h-4 w-4" />
          <span>Hooks</span>
          {options.hooks && options.hooks.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {options.hooks.length}
            </Badge>
          )}
        </DropdownMenuItem>

        {/* Allowed Tools */}
        <DropdownMenuItem disabled>
          <Wrench className="mr-2 h-4 w-4" />
          <span>Allowed Tools</span>
          {options.allowedTools && options.allowedTools.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {options.allowedTools.length}
            </Badge>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Disable Model Invocation */}
        <DropdownMenuItem onClick={toggleDisableModelInvocation}>
          <span>Disable Model Invocation</span>
          {options.disableModelInvocation && (
            <span className="ml-auto text-xs">✓</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
