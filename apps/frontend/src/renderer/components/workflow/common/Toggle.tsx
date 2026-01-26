/**
 * Toggle Component
 * ================
 *
 * Simple toggle switch component.
 */

import React from 'react';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { cn } from '../../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between space-x-2', className)}>
      <div className="flex-1 space-y-0.5">
        {label && (
          <Label htmlFor="toggle" className="text-sm font-medium">
            {label}
          </Label>
        )}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id="toggle" checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
};
