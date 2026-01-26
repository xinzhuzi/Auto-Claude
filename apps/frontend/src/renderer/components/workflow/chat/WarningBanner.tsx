/**
 * Warning Banner Component
 * ========================
 *
 * Warning banner for displaying alerts in chat interface.
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Button } from '../../ui/button';
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface WarningBannerProps {
  title?: string;
  message: string;
  type?: 'warning' | 'info' | 'error';
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  className?: string;
}

const iconMap = {
  warning: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
};

const variantMap = {
  warning: 'default',
  info: 'default',
  error: 'destructive',
} as const;

export const WarningBanner: React.FC<WarningBannerProps> = ({
  title,
  message,
  type = 'warning',
  action,
  onDismiss,
  className,
}) => {
  return (
    <Alert variant={variantMap[type]} className={cn('relative', className)}>
      {iconMap[type]}

      {/* Dismiss button */}
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="absolute top-2 right-2 h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {title && <AlertTitle>{title}</AlertTitle>}

      <AlertDescription className="flex items-center justify-between gap-4">
        <span>{message}</span>

        {/* Action button */}
        {action && (
          <Button
            variant="outline"
            size="sm"
            onClick={action.onClick}
            className="shrink-0"
          >
            {action.label}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
