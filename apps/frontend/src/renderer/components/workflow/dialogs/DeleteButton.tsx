/**
 * Delete Button Component
 * =======================
 *
 * Button with confirmation dialog for delete actions.
 */

import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { cn } from '../../../lib/utils';

interface DeleteButtonProps {
  onDelete: () => void;
  itemName?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  buttonLabel?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  className?: string;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  onDelete,
  itemName = 'this item',
  confirmTitle = 'Confirm Delete',
  confirmMessage,
  buttonLabel,
  variant = 'destructive',
  size = 'default',
  disabled = false,
  className,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const defaultMessage = confirmMessage || `Are you sure you want to delete ${itemName}? This action cannot be undone.`;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowConfirm(true)}
        disabled={disabled}
        className={cn('gap-2', className)}
      >
        <Trash2 className="h-4 w-4" />
        {buttonLabel && <span>{buttonLabel}</span>}
      </Button>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={confirmTitle}
        message={defaultMessage}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={onDelete}
      />
    </>
  );
};
