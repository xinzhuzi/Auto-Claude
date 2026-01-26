/**
 * Number Parameter Component
 * ===========================
 *
 * Input field for number-type MCP parameters.
 */

import React from 'react';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { cn } from '../../../../lib/utils';

interface NumberParameterProps {
  name: string;
  value: number | null;
  onChange: (value: number | null) => void;
  schema?: {
    description?: string;
    minimum?: number;
    maximum?: number;
    multipleOf?: number;
    default?: number;
  };
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const NumberParameter: React.FC<NumberParameterProps> = ({
  name,
  value,
  onChange,
  schema = {},
  required = false,
  disabled = false,
  className,
}) => {
  const { description, minimum, maximum, multipleOf } = schema;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(null);
    } else {
      const numVal = parseFloat(val);
      if (!isNaN(numVal)) {
        onChange(numVal);
      }
    }
  };

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
        type="number"
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        min={minimum}
        max={maximum}
        step={multipleOf}
      />
      {(minimum !== undefined || maximum !== undefined) && (
        <p className="text-xs text-muted-foreground">
          {minimum !== undefined && maximum !== undefined
            ? `Range: ${minimum} - ${maximum}`
            : minimum !== undefined
              ? `Minimum: ${minimum}`
              : `Maximum: ${maximum}`}
        </p>
      )}
    </div>
  );
};
