/**
 * Settings Dropdown Component
 * ============================
 *
 * Settings menu for chat configuration.
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
import { Settings, Trash2, Download, Cpu, Thermometer } from 'lucide-react';

interface SettingsDropdownProps {
  onClearConversation?: () => void;
  onExportConversation?: () => void;
  onModelChange?: (model: string) => void;
  onTemperatureChange?: (temperature: number) => void;
  currentModel?: string;
  currentTemperature?: number;
  disabled?: boolean;
}

const AVAILABLE_MODELS = [
  { value: 'sonnet', label: 'Claude Sonnet 4.5' },
  { value: 'opus', label: 'Claude Opus 4.5' },
  { value: 'haiku', label: 'Claude Haiku 3.5' },
];

const TEMPERATURE_OPTIONS = [
  { value: 0, label: 'Precise (0.0)' },
  { value: 0.5, label: 'Balanced (0.5)' },
  { value: 1, label: 'Creative (1.0)' },
];

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  onClearConversation,
  onExportConversation,
  onModelChange,
  onTemperatureChange,
  currentModel = 'sonnet',
  currentTemperature = 1,
  disabled = false,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled}>
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Chat Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Model selection */}
        {onModelChange && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Cpu className="mr-2 h-4 w-4" />
              <span>Model</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {AVAILABLE_MODELS.map((model) => (
                <DropdownMenuItem
                  key={model.value}
                  onClick={() => onModelChange(model.value)}
                  className={currentModel === model.value ? 'bg-accent' : ''}
                >
                  {model.label}
                  {currentModel === model.value && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Temperature selection */}
        {onTemperatureChange && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Thermometer className="mr-2 h-4 w-4" />
              <span>Temperature</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {TEMPERATURE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onTemperatureChange(option.value)}
                  className={currentTemperature === option.value ? 'bg-accent' : ''}
                >
                  {option.label}
                  {currentTemperature === option.value && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {(onModelChange || onTemperatureChange) && <DropdownMenuSeparator />}

        {/* Export conversation */}
        {onExportConversation && (
          <DropdownMenuItem onClick={onExportConversation}>
            <Download className="mr-2 h-4 w-4" />
            <span>Export Conversation</span>
          </DropdownMenuItem>
        )}

        {/* Clear conversation */}
        {onClearConversation && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onClearConversation}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Clear Conversation</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
