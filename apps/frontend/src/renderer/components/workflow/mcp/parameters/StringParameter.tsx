/**
 * String Parameter Component
 * ==========================
 *
 * Input field for string-type MCP parameters.
 */

import React from 'react';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';
import { Label } from '../../../ui/label';
import { cn } from '../../../../lib/utils';

interface StringParameterProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  schema?: {
    description?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: string[];
    default?: string;
  };
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  className?: string;
}

export const StringParameter: React.FC<StringParameterProps> = ({
  name,
  value,
  onChange,
  schema = {},
  required = false,
  disabled = false,
  multiline = false,
  className,
}) => {
  const {
    description,
    minLength,
    maxLength,
    pattern,
    enum: enumValues,
  } = schema;

  // If enum values provided, render as select
  if (enumValues && enumValues.length > 0) {
    return (
      <div className={cn('space-y-2', className)}>
        <Label htmlFor={name}>
          {name}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <select
          id={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select {name}</option>
          {enumValues.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Multiline text area
  if (multiline || (maxLength && maxLength > 200)) {
    return (
      <div className={cn('space-y-2', className)}>
        <Label htmlFor={name}>
          {name}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <Textarea
          id={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
         minLength={minLength}
          maxLength={maxLength}
          rows={4}
        />
        {maxLength && (
          <p className="text-xs text-muted-foreground text-right">
            {value.length} / {maxLength}
          </p>
        )}
      </div>
    );
  }

  // Single line input
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name}>
        {name}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <Input
        id={name}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        pattern={pattern}
      />
    </div>
  );
};
