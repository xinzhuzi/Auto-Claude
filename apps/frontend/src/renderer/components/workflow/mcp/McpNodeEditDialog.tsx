/**
 * McpNodeEditDialog Component
 *
 * Dialog for editing MCP node parameters
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { ParameterFormGenerator, type ParameterSchema } from './ParameterFormGenerator';
import { cn } from '../../../lib/utils';

interface McpNodeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeData: {
    serverId: string;
    toolName: string;
    mode?: 'manualParameterConfig' | 'aiParameterConfig' | 'aiToolSelection';
    parameterValues?: Record<string, any>;
    aiParameterConfig?: {
      description: string;
    };
    aiToolSelectionConfig?: {
      taskDescription: string;
    };
    inputSchema?: any;
  };
  onSave: (data: any) => void;
}

export const McpNodeEditDialog: React.FC<McpNodeEditDialogProps> = ({
  open,
  onOpenChange,
  nodeData,
  onSave,
}) => {
  const [mode, setMode] = useState<'manualParameterConfig' | 'aiParameterConfig' | 'aiToolSelection'>(
    nodeData.mode || 'manualParameterConfig'
  );
  const [parameterValues, setParameterValues] = useState<Record<string, any>>(
    nodeData.parameterValues || {}
  );
  const [aiParameterDescription, setAiParameterDescription] = useState(
    nodeData.aiParameterConfig?.description || ''
  );
  const [aiTaskDescription, setAiTaskDescription] = useState(
    nodeData.aiToolSelectionConfig?.taskDescription || ''
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setMode(nodeData.mode || 'manualParameterConfig');
      setParameterValues(nodeData.parameterValues || {});
      setAiParameterDescription(nodeData.aiParameterConfig?.description || '');
      setAiTaskDescription(nodeData.aiToolSelectionConfig?.taskDescription || '');
      setErrors({});
    }
  }, [open, nodeData]);

  // Convert JSON Schema to ParameterSchema
  const getParameterSchema = (): ParameterSchema[] => {
    if (!nodeData.inputSchema?.properties) return [];

    return Object.entries(nodeData.inputSchema.properties).map(([name, schema]: [string, any]) => ({
      name,
      type: schema.type || 'string',
      description: schema.description,
      required: nodeData.inputSchema.required?.includes(name),
      default: schema.default,
      items: schema.items,
      properties: schema.properties,
    }));
  };

  const validateParameters = (): boolean => {
    const newErrors: Record<string, string> = {};
    const schema = getParameterSchema();

    schema.forEach((param) => {
      if (param.required && !parameterValues[param.name]) {
        newErrors[param.name] = `${param.name} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    // Validate based on mode
    if (mode === 'manualParameterConfig') {
      if (!validateParameters()) {
        return;
      }
    } else if (mode === 'aiParameterConfig') {
      if (!aiParameterDescription.trim()) {
        setErrors({ aiDescription: 'Parameter description is required' });
        return;
      }
    } else if (mode === 'aiToolSelection') {
      if (!aiTaskDescription.trim()) {
        setErrors({ aiTask: 'Task description is required' });
        return;
      }
    }

    // Prepare data based on mode
    const data: any = {
      mode,
    };

    if (mode === 'manualParameterConfig') {
      data.parameterValues = parameterValues;
    } else if (mode === 'aiParameterConfig') {
      data.aiParameterConfig = {
        description: aiParameterDescription,
      };
    } else if (mode === 'aiToolSelection') {
      data.aiToolSelectionConfig = {
        taskDescription: aiTaskDescription,
      };
    }

    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure MCP Tool</DialogTitle>
          <DialogDescription>
            {nodeData.serverId} : {nodeData.toolName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <Label htmlFor="mode">Configuration Mode</Label>
            <Select value={mode} onValueChange={(value: any) => setMode(value)}>
              <SelectTrigger id="mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manualParameterConfig">
                  Manual Parameter Config
                </SelectItem>
                <SelectItem value="aiParameterConfig">
                  AI Parameter Config
                </SelectItem>
                <SelectItem value="aiToolSelection">
                  AI Tool Selection
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {mode === 'manualParameterConfig' && 'Manually configure all parameters'}
              {mode === 'aiParameterConfig' && 'Let AI determine parameter values from description'}
              {mode === 'aiToolSelection' && 'Let AI select the best tool for the task'}
            </p>
          </div>

          {/* Mode-specific content */}
          {mode === 'manualParameterConfig' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-3">Parameters</h4>
                {getParameterSchema().length === 0 ? (
                  <p className="text-sm text-muted-foreground">No parameters required</p>
                ) : (
                  <ParameterFormGenerator
                    schema={getParameterSchema()}
                    values={parameterValues}
                    onChange={setParameterValues}
                    errors={errors}
                  />
                )}
              </div>
            </div>
          )}

          {mode === 'aiParameterConfig' && (
            <div className="space-y-2">
              <Label htmlFor="aiDescription">Parameter Description</Label>
              <Textarea
                id="aiDescription"
                value={aiParameterDescription}
                onChange={(e) => setAiParameterDescription(e.target.value)}
                placeholder="Describe what values the parameters should have..."
                rows={6}
                className={cn(errors.aiDescription && 'border-destructive')}
              />
              {errors.aiDescription && (
                <p className="text-xs text-destructive">{errors.aiDescription}</p>
              )}
              <p className="text-xs text-muted-foreground">
                AI will determine the parameter values based on this description
              </p>
            </div>
          )}

          {mode === 'aiToolSelection' && (
            <div className="space-y-2">
              <Label htmlFor="aiTask">Task Description</Label>
              <Textarea
                id="aiTask"
                value={aiTaskDescription}
                onChange={(e) => setAiTaskDescription(e.target.value)}
                placeholder="Describe the task you want to accomplish..."
                rows={6}
                className={cn(errors.aiTask && 'border-destructive')}
              />
              {errors.aiTask && (
                <p className="text-xs text-destructive">{errors.aiTask}</p>
              )}
              <p className="text-xs text-muted-foreground">
                AI will select the most appropriate tool from this server
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
