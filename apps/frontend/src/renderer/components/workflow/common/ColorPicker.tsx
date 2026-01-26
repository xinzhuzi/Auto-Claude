/**
 * Color Picker Component
 * ======================
 *
 * Simple color picker with predefined color palette.
 */

import React from 'react';
import { Button } from '../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Check } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
  disabled?: boolean;
}

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#64748b', // slate
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  colors = DEFAULT_COLORS,
  disabled = false,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="w-full justify-start gap-2"
        >
          <div
            className="h-4 w-4 rounded border"
            style={{ backgroundColor: value }}
          />
          <span className="text-xs font-mono">{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="grid grid-cols-6 gap-2">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={cn(
                'h-8 w-8 rounded border-2 transition-all hover:scale-110',
                value === color ? 'border-primary ring-2 ring-primary' : 'border-transparent'
              )}
              style={{ backgroundColor: color }}
              title={color}
            >
              {value === color && (
                <Check className="h-4 w-4 text-white drop-shadow-md mx-auto" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
