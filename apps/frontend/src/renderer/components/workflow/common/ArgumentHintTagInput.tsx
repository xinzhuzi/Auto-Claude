/**
 * Argument Hint Tag Input Component
 * ==================================
 *
 * Specialized tag input for argument hints (key=value pairs).
 */

import React, { useState, KeyboardEvent } from 'react';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ArgumentHintTagInputProps {
  hints: Record<string, string>;
  onChange: (hints: Record<string, string>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const ArgumentHintTagInput: React.FC<ArgumentHintTagInputProps> = ({
  hints,
  onChange,
  placeholder = 'Add hint (key=value)',
  disabled = false,
  className,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addHint(inputValue.trim());
    } else if (e.key === 'Backspace' && !inputValue && Object.keys(hints).length > 0) {
      // Remove last hint
      const keys = Object.keys(hints);
      const lastKey = keys[keys.length - 1];
      removeHint(lastKey);
    }
  };

  const addHint = (value: string) => {
    // Parse key=value format
    const match = value.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
    
    if (!match) {
      setError('Invalid format. Use: key=value');
      return;
    }

    const [, key, hintValue] = match;

    if (hints[key]) {
      setError(`Hint "${key}" already exists`);
      return;
    }

    onChange({ ...hints, [key]: hintValue });
    setInputValue('');
    setError(null);
  };

  const removeHint = (key: string) => {
    const newHints = { ...hints };
    delete newHints[key];
    onChange(newHints);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-[42px]">
        {Object.entries(hints).map(([key, value]) => (
          <Badge key={key} variant="secondary" className="gap-1">
            <span className="font-mono text-xs">
              {key}={value}
            </span>
            <button
              type="button"
              onClick={() => removeHint(key)}
              disabled={disabled}
              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
        (null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 min-w-[200px] border-0 focus-visible:ring-0 h-auto p-0"
        />
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Press Enter to add. Format: key=value
      </p>
    </div>
  );
};
