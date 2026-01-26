/**
 * Validation Step
 * ===============
 *
 * Step component for validating workflow configuration.
 * Shows validation results and allows user to proceed or go back.
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertTriangle, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ValidationResult {
  type: 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

interface ValidationStepProps {
  results: ValidationResult[];
  onConfirm?: () => void;
  onPrevious?: () => void;
  confirmLabel?: string;
  previousLabel?: string;
  canConfirm?: boolean;
  className?: string;
}

export const ValidationStep: React.FC<ValidationStepProps> = ({
  results,
  onConfirm,
  onPrevious,
  confirmLabel = 'Confirm',
  previousLabel = 'Previous',
  canConfirm = true,
  className,
}) => {
  const hasErrors = results.some(r => r.type === 'error');
  const hasWarnings = results.some(r => r.type === 'warning');
  const allSuccess = results.every(r => r.type === 'success');

  const getIcon = (type: ValidationResult['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getVariant = (type: ValidationResult['type']) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'warning':
        return 'default';
      case 'error':
        return 'destructive';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Validation Results</h3>
        <p className="text-sm text-muted-foreground">
          {allSuccess && 'All checks passed! You can proceed with the configuration.'}
          {hasWarnings && !hasErrors && 'Some warnings were found. Review them before proceeding.'}
          {hasErrors && 'Errors were found. Please fix them before proceeding.'}
        </p>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <Alert key={index} variant={getVariant(result.type)}>
            <div className="flex items-start gap-3">
              {getIcon(result.type)}
              <div className="flex-1">
                <AlertTitle>{result.title}</AlertTitle>
                <AlertDescription>{result.message}</AlertDescription>
              </div>
            </div>
          </Alert>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {onPrevious && (
            <Button
              variant="outline"
              onClick={onPrevious}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {previousLabel}
            </Button>
          )}
        </div>

        <div>
          {onConfirm && (
            <Button
              onClick={onConfirm}
              disabled={!canConfirm || hasErrors}
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
