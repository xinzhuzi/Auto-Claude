/**
 * Edit In Editor Button Component
 * ================================
 *
 * Button to open content in external editor.
 */

import React from 'react';
import { Button } from '../../ui/button';
import { ExternalLink } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface EditInEditorButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const EditInEditorButton: React.FC<EditInEditorButtonProps> = ({
  onClick,
  disabled = false,
  label = 'Edit in Editor',
  variant = 'outline',
  size = 'sm',
  className,
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={variant}
      size={size}
      className={cn('gap-2', className)}
    >
      <ExternalLink className="h-4 w-4" />
      {size !== 'icon' && <span>{label}</span>}
    </Button>
  );
};
