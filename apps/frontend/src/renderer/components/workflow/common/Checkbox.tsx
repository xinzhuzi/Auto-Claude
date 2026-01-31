/**
 * Checkbox Component
 * ==================
 *
 * Simple checkbox component with label support.
 */

import React from 'react';
import { Checkbox as UICheckbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { cn } from '../../../lib/utils';

interface CheckboxProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className,
}) => {
  const checkboxId = id || 'checkbox';
  return (
    <div className={cn('flex items-start space-x-2', className)}>
      <UICheckbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mt-0.5"
      />
      {(label || description) && (
        <div className="flex-1 space-y-0.5">
          {label && (
            <Label htmlFor={checkboxId} className="text-sm font-medium cursor-pointer">
              {label}
            </Label>
          )}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
    </div>
  );
};
