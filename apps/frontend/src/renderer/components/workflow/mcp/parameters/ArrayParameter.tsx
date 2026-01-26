/**
 * Array Parameter Component
 * ==========================
 *
 * Input field for array-type MCP parameters.
 */

import React, { useState } from 'react';
import { Label } from '../../../ui/label';
import { Input } from '../../../ui/input';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Plus, X } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface ArrayParameterProps {
  name: string;
  value: any[];
  onChange: (value: any[]) => void;
  schema?: {
    description?: string;
    items?: {
      type?: string;
      enum?: string[];
    };
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
  };
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const ArrayParameter: React.FC<ArrayParameterProps> = ({
  name,
  value,
  onChange,
  schema = {},
  required = false,
  disabled = false,
  className,
}) => {
  const { description, items = {}, minItems, maxItems, uniqueItems } = schema;
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmedValue = inputValue.trim();
    
    if (!trimmedValue) {
      setError('Value cannot be empty');
      return;
    }

    if (uniqueItems && value.includes(trimmedValue)) {
      setError('Value must be unique');
      return;
    }

    if (maxItems && value.length >= maxItems) {
      setError(`Maximum ${maxItems} items allowed`);
      return;
    }

    // Parse value based on item type
    let parsedValue: any = trimmedValue;
    if (items.type === 'number') {
      parsedValue = parseFloat(trimmedValue);
      if (isNaN(parsedValue)) {
        setError('Value must be a number');
        return;
      }
    } else if (items.type === 'boolean') {
      parsedValue = trimmedValue.toLowerCase() === 'true';
    }

    onChange([...value, parsedValue]);
    setInputValue('');
    setError(null);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const itemType = items.type || 'string';

  // If enum values provided, render as select
  if (items.enum && items.enum.length > 0) {
    return (
      <div className={cn('space-y-2', className)}>
        <Label htmlFor={name}>
          {name}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <div className="space-y-2">
          <select
            id={name}
            value=""
    onChange={(e) => {
              const val = e.target.value;
              if (val && !value.includes(val)) {
                onChange([...value, val]);
              }
            }}
            disabled={disabled || (maxItems !== undefined && value.length >= maxItems)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Add item...</option>
            {items.enum.map((option) => (
              <option
                key={option}
                value={option}
                disabled={uniqueItems && value.includes(option)}
              >
                {option}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            {value.map((item, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {String(item)}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
         </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Free-form input
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name}>
        {name}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex gap-2">
        <Input
          id={name}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled || (maxItems !== undefined && value.length >= maxItems)}
          placeholder={`Add ${itemType} item...`}
        />
        <Button
          type="button"
          onClick={handleAdd}
          disabled={disabled || !inputValue.trim() || (maxItems !== undefined && value.length >= maxItems)}
          size="icon"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {value.map((item, index) => (
          <Badge key={index} variant="secondary" className="gap-1">
            {String(item)}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              disabled={disabled}
              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {(minItems !== undefined || maxItems !== undefined) && (
        <p className="text-xs text-muted-foreground">
          {minItems !== undefined && maxItems !== undefined
            ? `Items: ${value.length} / ${minItems}-${maxItems}`
            : minItems !== undefined
              ? `Minimum ${minItems} items`
              : `Maximum ${maxItems} items`}
        </p>
      )}
    </div>
  );
};
