/**
 * ParameterFormGenerator Component
 *
 * Dynamically generates form fields for MCP tool parameters
 * Supports 5 parameter types: Array, Boolean, Number, Object, String
 */

import React from 'react';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import { Button } from '../../ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface ParameterSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  default?: any;
  items?: ParameterSchema; // For array type
  properties?: Record<string, ParameterSchema>; // For object type
}

interface ParameterFormGeneratorProps {
  schema: ParameterSchema[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  errors?: Record<string, string>;
}

export const ParameterFormGenerator: React.FC<ParameterFormGeneratorProps> = ({
  schema,
  values,
  onChange,
  errors = {},
}) => {
  const handleChange = (name: string, value: any) => {
    onChange({
      ...values,
      [name]: value,
    });
  };

  const renderParameter = (param: ParameterSchema) => {
    const value = values[param.name];
    const error = errors[param.name];

    switch (param.type) {
      case 'string':
        return (
          <StringParameter
            param={param}
            value={value}
            onChange={(v) => handleChange(param.name, v)}
            error={error}
          />
        );

      case 'number':
        return (
          <NumberParameter
            param={param}
            value={value}
            onChange={(v) => handleChange(param.name, v)}
            error={error}
          />
        );

      case 'boolean':
        return (
          <BooleanParameter
            param={param}
            value={value}
            onChange={(v) => handleChange(param.name, v)}
          />
        );

      case 'array':
        return (
          <ArrayParameter
            param={param}
            value={value}
            onChange={(v) => handleChange(param.name, v)}
            error={error}
          />
        );

      case 'object':
        return (
          <ObjectParameter
            param={param}
            value={value}
            onChange={(v) => handleChange(param.name, v)}
            error={error}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {schema.map((param) => (
        <div key={param.name} className="space-y-2">
          {renderParameter(param)}
        </div>
      ))}
    </div>
  );
};

// String Parameter Component
interface ParameterProps {
  param: ParameterSchema;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

const StringParameter: React.FC<ParameterProps> = ({ param, value, onChange, error }) => {
  const isLongText = param.description && param.description.includes('long') ||
                     (param.default && typeof param.default === 'string' && param.default.length > 100);

  return (
    <div className="space-y-2">
      <Label htmlFor={param.name}>
        {param.name}
        {param.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {param.description && (
        <p className="text-xs text-muted-foreground">{param.description}</p>
      )}
      {isLongText ? (
        <Textarea
          id={param.name}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.default || `Enter ${param.name}`}
          rows={4}
          className={cn(error && 'border-destructive')}
        />
      ) : (
        <Input
          id={param.name}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.default || `Enter ${param.name}`}
          className={cn(error && 'border-destructive')}
        />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

// Number Parameter Component
const NumberParameter: React.FC<ParameterProps> = ({ param, value, onChange, error }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={param.name}>
        {param.name}
        {param.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {param.description && (
        <p className="text-xs text-muted-foreground">{param.description}</p>
      )}
      <Input
        id={param.name}
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        placeholder={param.default?.toString() || `Enter ${param.name}`}
        className={cn(error && 'border-destructive')}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

// Boolean Parameter Component
const BooleanParameter: React.FC<Omit<ParameterProps, 'error'>> = ({ param, value, onChange }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor={param.name}>{param.name}</Label>
        {param.description && (
          <p className="text-xs text-muted-foreground">{param.description}</p>
        )}
      </div>
      <Switch
        id={param.name}
        checked={value ?? param.default ?? false}
        onCheckedChange={onChange}
      />
    </div>
  );
};

// Array Parameter Component
const ArrayParameter: React.FC<ParameterProps> = ({ param, value, onChange, error }) => {
  const arrayValue = Array.isArray(value) ? value : [];

  const handleAdd = () => {
    onChange([...arrayValue, '']);
  };

  const handleRemove = (index: number) => {
    onChange(arrayValue.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, itemValue: any) => {
    const newArray = [...arrayValue];
    newArray[index] = itemValue;
    onChange(newArray);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>
          {param.name}
          {param.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAdd}
          className="h-7 px-2"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      {param.description && (
        <p className="text-xs text-muted-foreground">{param.description}</p>
      )}
      <div className="space-y-2">
        {arrayValue.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => handleItemChange(index, e.target.value)}
              placeholder={`Item ${index + 1}`}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => handleRemove(index)}
              className="h-9 w-9 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {arrayValue.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No items added</p>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

// Object Parameter Component
const ObjectParameter: React.FC<ParameterProps> = ({ param, value, onChange, error }) => {
  const objectValue = typeof value === 'object' && value !== null ? value : {};

  return (
    <div className="space-y-2">
      <Label>
        {param.name}
        {param.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {param.description && (
        <p className="text-xs text-muted-foreground">{param.description}</p>
      )}
      <div className="border rounded-md p-3 space-y-3">
        {param.properties ? (
          // Structured object with known properties
          Object.entries(param.properties).map(([key, propSchema]) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{key}</Label>
              {propSchema.type === 'string' && (
                <Input
                  value={objectValue[key] || ''}
                  onChange={(e) => onChange({ ...objectValue, [key]: e.target.value })}
                  placeholder={propSchema.description || key}
                  className="h-8 text-xs"
                />
              )}
              {propSchema.type === 'number' && (
                <Input
                  type="number"
                  value={objectValue[key] ?? ''}
                  onChange={(e) => onChange({ ...objectValue, [key]: Number(e.target.value) })}
                  placeholder={propSchema.description || key}
                  className="h-8 text-xs"
                />
              )}
              {propSchema.type === 'boolean' && (
                <Switch
                  checked={objectValue[key] ?? false}
                  onCheckedChange={(checked) => onChange({ ...objectValue, [key]: checked })}
                />
              )}
            </div>
          ))
        ) : (
          // Free-form JSON object
          <Textarea
            value={JSON.stringify(objectValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                // Invalid JSON, don't update
              }
            }}
            placeholder='{"key": "value"}'
            rows={6}
            className={cn('font-mono text-xs', error && 'border-destructive')}
          />
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
