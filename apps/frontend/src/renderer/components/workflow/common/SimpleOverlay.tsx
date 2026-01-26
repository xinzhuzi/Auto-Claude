/**
 * Simple Overlay Component
 * ========================
 *
 * Simple overlay/backdrop for modals and dialogs.
 */

import React from 'react';
import { cn } from '../../../lib/utils';

interface SimpleOverlayProps {
  visible: boolean;
  onClick?: () => void;
  opacity?: number;
  className?: string;
  children?: React.ReactNode;
}

export const SimpleOverlay: React.FC<SimpleOverlayProps> = ({
  visible,
  onClick,
  opacity = 0.5,
  className,
  children,
}) => {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-black transition-opacity',
        className
      )}
      style={{ opacity }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
