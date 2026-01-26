/**
 * Processing Overlay Component
 * =============================
 *
 * Full-screen overlay with loading indicator.
 */

import React from 'react';
import { Spinner } from './Spinner';
import { cn } from '../../../lib/utils';

interface ProcessingOverlayProps {
  visible: boolean;
  message?: string;
  className?: string;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  visible,
  message = 'Processing...',
  className,
}) => {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
        'flex items-center justify-center',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4 p-8 rounded-lg bg-card border shadow-lg">
        <Spinner size="lg" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};
