/**
 * Progress Bar Component
 * ======================
 *
 * Progress indicator for operations.
 */

import React from 'react';
import { cn } from '../../../lib/utils';

interface ProgressBarProps {
  value?: number; // 0-100, undefined for indeterminate
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  showPercentage = true,
  variant = 'default',
  size = 'md',
  className,
}) => {
  const isIndeterminate = value === undefined;
  const percentage = isIndeterminate ? 0 : Math.min(100, Math.max(0, value));

  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Label and percentage */}
      {(label || (showPercentage && !isIndeterminate)) && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <span className="text-sm text-muted-foreground">{label}</span>
          )}
          {showPercentage && !isIndeterminate && (
            <span className="text-sm font-medium">{percentage}%</span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div
        className={cn(
          'w-full bg-muted rounded-full overflow-hidden',
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-in-out',
            variantClasses[variant],
            isIndeterminate && 'animate-pulse'
          )}
          style={{
            width: isIndeterminate ? '100%' : `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
};
