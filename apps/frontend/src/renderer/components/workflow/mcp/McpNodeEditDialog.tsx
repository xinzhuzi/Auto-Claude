/**
 * McpNodeEditDialog Component
 *
 * Dialog for editing MCP node parameters
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('workflowStudio');
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
          <DialogTitle>{t('mcpEditDialog.title', '配置 MCP 工具')}</DialogTitle>
          <DialogDescription>
            {nodeData.serverId && nodeData.toolName
              ? `${nodeData.serverId}:${nodeData.toolName}`
              : t('mcpEditDialog.selectToolFirst', '请先选择 MCP 工具')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <Label htmlFor="mode">{t('mcpEditDialog.configMode', '配置模式')}</Label>
            <Select value={mode} onValueChange={(value: any) => setMode(value)}>
              <SelectTrigger id="mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manualParameterConfig">
                  {t('mcpEditDialog.manualMode', '手动配置参数')}
                </SelectItem>
                <SelectItem value="aiParameterConfig">
                  {t('mcpEditDialog.aiParamMode', 'AI 参数配置')}
                </SelectItem>
                <SelectItem value="aiToolSelection">
                  {t('mcpEditDialog.aiToolMode', 'AI 工具选择')}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {mode === 'manualParameterConfig' && t('mcpEditDialog.manualModeDesc', '手动配置所有参数')}
              {mode === 'aiParameterConfig' && t('mcpEditDialog.aiParamModeDesc', '让 AI 根据描述确定参数值')}
              {mode === 'aiToolSelection' && t('mcpEditDialog.aiToolModeDesc', '让 AI 为任务选择最合适的工具')}
            </p>
          </div>

          {/* Mode-specific content */}
          {mode === 'manualParameterConfig' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-3">{t('mcpEditDialog.parameters', '参数')}</h4>
                {getParameterSchema().length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('mcpEditDialog.noParams', '无需参数')}</p>
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
              <Label htmlFor="aiDescription">{t('mcpEditDialog.paramDescription', '参数描述')}</Label>
              <Textarea
                id="aiDescription"
                value={aiParameterDescription}
                onChange={(e) => setAiParameterDescription(e.target.value)}
                placeholder={t('mcpEditDialog.paramDescPlaceholder', '描述参数应该具有什么值...')}
                rows={6}
                className={cn(errors.aiDescription && 'border-destructive')}
              />
              {errors.aiDescription && (
                <p className="text-xs text-destructive">{errors.aiDescription}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('mcpEditDialog.aiParamHint', 'AI 将根据此描述确定参数值')}
              </p>
            </div>
          )}

          {mode === 'aiToolSelection' && (
            <div className="space-y-2">
              <Label htmlFor="aiTask">{t('mcpEditDialog.taskDescription', '任务描述')}</Label>
              <Textarea
                id="aiTask"
                value={aiTaskDescription}
                onChange={(e) => setAiTaskDescription(e.target.value)}
                placeholder={t('mcpEditDialog.taskDescPlaceholder', '描述您想要完成的任务...')}
                rows={6}
                className={cn(errors.aiTask && 'border-destructive')}
              />
              {errors.aiTask && (
                <p className="text-xs text-destructive">{errors.aiTask}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('mcpEditDialog.aiToolHint', 'AI 将从此服务器选择最合适的工具')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel', '取消')}
          </Button>
          <Button onClick={handleSave}>
            {t('mcpEditDialog.saveConfig', '保存配置')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
