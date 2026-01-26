/**
 * Configuration Step
 * ==================
 *
 * Step component for configuring workflow node settings.
 * Part of a multi-step configuration wizard.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfigurationStepProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  previousLabel?: string;
  skipLabel?: string;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  canSkip?: boolean;
  className?: string;
}

export const ConfigurationStep: React.FC<ConfigurationStepProps> = ({
  title,
  description,
  children,
  onNext,
  onPrevious,
  onSkip,
  nextLabel = 'Next',
  previousLabel = 'Previous',
  skipLabel = 'Skip',
  canGoNext = true,
  canGoPrevious = true,
  canSkip = false,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {children}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {onPrevious && (
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={!canGoPrevious}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {previousLabel}
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {onSkip && canSkip && (
            <Button
              variant="ghost"
              onClick={onSkip}
            >
              {skipLabel}
            </Button>
          )}
          {onNext && (
            <Button
              onClick={onNext}
              disabled={!canGoNext}
              className="gap-2"
            >
              {nextLabel}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
