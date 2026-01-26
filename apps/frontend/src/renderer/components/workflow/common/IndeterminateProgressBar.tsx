/**
 * Indeterminate Progress Bar Component
 * ====================================
 *
 * Progress bar with indeterminate animation for unknown duration tasks.
 */

import React from 'react';
import { cn } from '../../../lib/utils';

interface IndeterminateProgressBarProps {
  className?: string;
  height?: number;
}

export const IndeterminateProgressBar: React.FC<IndeterminateProgressBarProps> = ({
  className,
  height = 4,
}) => {
  return (
    <div
      className={cn('relative w-full overflow-hidden bg-secondary', className)}
      style={{ height: `${height}px` }}
    >
      <div
        className="absolute inset-0 bg-primary animate-indeterminate-progress"
        style={{
          animation: 'indeterminate-progress 1.5s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes indeterminate-progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};
