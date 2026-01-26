/**
 * Boolean Parameter Component
 * ============================
 *
 * Checkbox for boolean-type MCP parameters.
 */

import React from 'react';
import { Label } from '../../../ui/label';
import { Checkbox } from '../../common/Checkbox';
import { cn } from '../../../../lib/utils';

interface BooleanParameterProps {
  name: string;
  value: boolean;
  onChange: (value: boolean) => void;
  schema?: {
    description?: string;
    default?: boolean;
  };
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const BooleanParameter: React.FC<BooleanParameterProps> = ({
  name,
  value,
  onChange,
  schema = {},
  required = false,
  disabled = false,
  className,
}) => {
  const { description } = schema;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start gap-3">
        <Checkbox
          id={name}
          checked={value}
          onCheckedChange={(checked) => onChange(checked === true)}
          disabled={disabled}
          
        />
        <div className="flex-1">
          <Label
            htmlFor={name}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {name}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};
