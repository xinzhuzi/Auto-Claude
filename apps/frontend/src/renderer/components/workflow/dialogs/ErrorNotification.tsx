/**
 * Error Notification Component
 * ============================
 *
 * Toast-style error notification component.
 */

import React, { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Button } from '../../ui/button';
import { XCircle, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ErrorNotificationProps {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDuration?: number;
  className?: string;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  visible,
  title = 'Error',
  message,
  onClose,
  autoClose = true,
  autoCloseDuration = 5000,
  className,
}) => {
  useEffect(() => {
    if (visible && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDuration);

      return () => clearTimeout(timer);
    }
  }, [visible, autoClose, autoCloseDuration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 w-96 animate-in slide-in-from-top-5',
        className
      )}
    >
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          {title}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-5 w-5 hover:bg-destructive/20"
          >
            <X className="h-3 w-3" />
          </Button>
        </AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
};
