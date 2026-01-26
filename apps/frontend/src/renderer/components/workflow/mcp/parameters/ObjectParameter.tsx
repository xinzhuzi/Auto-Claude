/**
 * Object Parameter Component
 * ===========================
 *
 * JSON editor for object-type MCP parameters.
 */

import React, { useState, useEffect } from 'react';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Alert, AlertDescription } from '../../../ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface ObjectParameterProps {
  name: string;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  schema?: {
    description?: string;
    properties?: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const ObjectParameter: React.FC<ObjectParameterProps> = ({
  name,
  value,
  onChange,
  schema = {},
  required = false,
  disabled = false,
  className,
}) => {
  const { description } = schema;
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialize JSON text from value
  useEffect(() => {
    try {
      setJsonText(JSON.stringify(value, null, 2));
    } catch (err) {
      setJsonText('{}');
    }
  }, []);

  const handleChange = (text: string) => {
    setJsonText(text);
    
    // Try to parse JSON
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        onChange(parsed);
        setError(null);
      } else {
        setError('Value must be a valid JSON object');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  const handleBlur = () => {
    // Try to format JSON on blur
    if (!error) {
      try {
        const parsed = JSON.parse(jsonText);
        setJsonText(JSON.stringify(parsed, null, 2));
      } catch {
        // Keep as is if invalid
      }
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name}>
        {name}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <Textarea
        id={name}
        value={jsonText}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
        rows={8}
        className={cn(
          'font-mono text-xs',
          error && 'border-destructive focus-visible:ring-destructive'
        )}
        placeholder='{\n  "key": "value"\n}'
      />
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
      <p className="text-xs text-muted-foreground">
        Enter a valid JSON object
      </p>
    </div>
  );
};
