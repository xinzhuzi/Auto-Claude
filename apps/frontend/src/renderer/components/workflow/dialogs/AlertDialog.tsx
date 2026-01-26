/**
 * Alert Dialog Component
 * ======================
 *
 * Simple alert dialog for displaying messages to users.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  okLabel?: string;
  onOk?: () => void;
}

const iconMap = {
  info: <Info className="h-5 w-5 text-blue-500" />,
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  warning: <AlertCircle className="h-5 w-5 text-yellow-500" />,
  error: <XCircle className="h-5 w-5 text-red-500" />,
};

export const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  onOpenChange,
  title,
  message,
  type = 'info',
  okLabel = 'OK',
  onOk,
}) => {
  const handleOk = () => {
    onOk?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {iconMap[type]}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleOk}>{okLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
