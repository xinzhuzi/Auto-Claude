/**
 * AI Generate Button Component
 * =============================
 *
 * Button with sparkles icon for AI generation features.
 */

import React from 'react';
import { Button } from '../../ui/button';
import { Sparkles } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Spinner } from './Spinner';

interface AiGenerateButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const AiGenerateButton: React.FC<AiGenerateButtonProps> = ({
  onClick,
  isLoading = false,
  disabled = false,
  label = 'Generate with AI',
  variant = 'default',
  size = 'default',
  className,
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      variant={variant}
      size={size}
      className={cn('gap-2', className)}
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {size !== 'icon' && <span>{isLoading ? 'Generating...' : label}</span>}
    </Button>
  );
};
