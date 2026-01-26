/**
 * Editable Name Field Component
 * ==============================
 *
 * Inline editable text field for workflow names.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Check, X, Pencil } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface EditableNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  onValidate?: (value: string) => string | null; // Returns error message or null
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export const EditableNameField: React.FC<EditableNameFieldProps> = ({
  value,
  onChange,
  onValidate,
  placeholder = 'Enter name',
  maxLength = 100,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedValue = editValue.trim();

    if (!trimmedValue) {
      setError('Name cannot be empty');
      return;
    }

    if (onValidate) {
      const validationError = onValidate(trimmedValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    onChange(trimmedValue);
    setIsEditing(false);
    setError(null);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        className={cn(
          'group flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded px-2 py-1 transition-colors',
          className
        )}
        onClick={() => setIsEditing(true)}
      >
        <span className="font-medium">{value || placeholder}</span>
        <Pencil className="h-3 w-3 opacity-0 groupity-50 transition-opacity" />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          maxLength={maxLength}
          className={cn('h-8', error && 'border-destructive')}
        />
        {error && (
          <p className="text-xs text-destructive mt-1">{error}</p>
        )}
      </div>
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleSave}
          onMouseDown={(e) => e.preventDefault()} // Prevent blur
        >
          <Check className="h-4 w-4 text-green-500" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleCancel}
          onMouseDown={(e) => e.preventDefault()} // Prevent blur
        >
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};
