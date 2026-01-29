/**
 * PropertyPanel Component
 *
 * Displays and edits properties of selected node
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { useWorkflowStore, useActiveWorkflow } from '../../stores/workflow-store';
import { cn } from '../../lib/utils';
import { NodeType, type WorkflowNode } from '../../../shared/types';
import { Trash2, Plus } from 'lucide-react';

interface PropertyPanelProps {
  className?: string;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ className }) => {
  const { t } = useTranslation('workflowStudio');
  const activeWorkflow = useActiveWorkflow();
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const selectedNode = activeWorkflow?.nodes.find((n) => n.id === selectedNodeId);

  if (!activeWorkflow) {
    return (
      <Card className={cn("w-80 p-4 overflow-y-auto", className)}>
        <h3 className="font-semibold mb-4">{t('properties.title', 'Properties')}</h3>
        <div className="text-sm text-muted-foreground">
          {t('properties.noWorkflow', 'No workflow selected')}
        </div>
      </Card>
    );
  }

  if (!selectedNode) {
    return (
      <Card className={cn("w-80 p-4 overflow-y-auto", className)}>
        <h3 className="font-semibold mb-4">{t('properties.title', 'Properties')}</h3>
        <div className="text-sm text-muted-foreground">
          {t('properties.noNodeSelected', 'Select a node to view properties')}
        </div>
      </Card>
    );
  }

  const handleUpdate = (updates: Partial<WorkflowNode['data']>) => {
    updateNodeData(selectedNode.id, updates);
  };

  return (
    <Card className={cn("w-80 p-4 overflow-y-auto", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="font-semibold text-lg">{t('properties.title', 'Properties')}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t(`nodes.${selectedNode.type}.name`, selectedNode.type)}
          </p>
        </div>

        {/* Node Name */}
        <div className="space-y-2">
          <Label htmlFor="node-name">{t('properties.nodeName', 'Node Name')}</Label>
          <Input
            id="node-name"
            value={selectedNode.name}
            onChange={(e) => {
              // Update node name (this would need a separate action in the store)
              // For now, we'll skip this as it requires updating the node itself, not just data
            }}
            placeholder={t('properties.nodeNamePlaceholder', 'Enter node name')}
          />
        </div>

        {/* Node-specific properties */}
        {renderNodeProperties(selectedNode, handleUpdate, t)}
      </div>
    </Card>
  );
};

function renderNodeProperties(
  node: WorkflowNode,
  handleUpdate: (updates: Partial<WorkflowNode['data']>) => void,
  t: (key: string, fallback?: string) => string
) {
  switch (node.type) {
    case NodeType.SubAgent:
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="description">{t('properties.description', 'Description')}</Label>
            <Input
              id="description"
              value={node.data.description}
              onChange={(e) => handleUpdate({ description: e.target.value })}
              placeholder={t('properties.descriptionPlaceholder', 'Brief description')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt">{t('properties.prompt', 'Prompt')}</Label>
            <Textarea
              id="prompt"
              value={node.data.prompt}
              onChange={(e) => handleUpdate({ prompt: e.target.value })}
              placeholder={t('properties.promptPlaceholder', 'Enter prompt')}
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">{t('properties.model', 'Model')}</Label>
            <Select
              value={node.data.model || 'inherit'}
              onValueChange={(value) => handleUpdate({ model: value as any })}
            >
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">{t('properties.modelInherit', 'Inherit')}</SelectItem>
                <SelectItem value="sonnet">Sonnet</SelectItem>
                <SelectItem value="opus">Opus</SelectItem>
                <SelectItem value="haiku">Haiku</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tools">{t('properties.tools', 'Tools')}</Label>
            <Input
              id="tools"
              value={node.data.tools || ''}
              onChange={(e) => handleUpdate({ tools: e.target.value })}
              placeholder={t('properties.toolsPlaceholder', 'Comma-separated tool names')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">{t('properties.color', 'Color')}</Label>
            <Select
              value={node.data.color || 'blue'}
              onValueChange={(value) => handleUpdate({ color: value as any })}
            >
              <SelectTrigger id="color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">{t('properties.colorBlue', 'Blue')}</SelectItem>
                <SelectItem value="green">{t('properties.colorGreen', 'Green')}</SelectItem>
                <SelectItem value="yellow">{t('properties.colorYellow', 'Yellow')}</SelectItem>
                <SelectItem value="red">{t('properties.colorRed', 'Red')}</SelectItem>
                <SelectItem value="purple">{t('properties.colorPurple', 'Purple')}</SelectItem>
                <SelectItem value="pink">{t('properties.colorPink', 'Pink')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );

    case NodeType.AskUserQuestion:
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="question">{t('properties.question', 'Question')}</Label>
            <Textarea
              id="question"
              value={node.data.questionText}
              onChange={(e) => handleUpdate({ questionText: e.target.value })}
              placeholder={t('properties.questionPlaceholder', 'Enter question')}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('properties.options', 'Options')}</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const newOption = {
                    id: `opt-${Date.now()}`,
                    label: '',
                    description: '',
                  };
                  handleUpdate({ options: [...node.data.options, newOption] });
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('properties.addOption', 'Add')}
              </Button>
            </div>
            <div className="space-y-2">
              {node.data.options.map((option, index) => (
                <div key={option.id || index} className="border rounded p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Option {index + 1}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const newOptions = node.data.options.filter((_, i) => i !== index);
                        handleUpdate({ options: newOptions });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    value={option.label}
                    onChange={(e) => {
                      const newOptions = [...node.data.options];
                      newOptions[index] = { ...option, label: e.target.value };
                      handleUpdate({ options: newOptions });
                    }}
                    placeholder={t('properties.optionLabel', 'Label')}
                  />
                  <Input
                    value={option.description}
                    onChange={(e) => {
                      const newOptions = [...node.data.options];
                      newOptions[index] = { ...option, description: e.target.value };
                      handleUpdate({ options: newOptions });
                    }}
                    placeholder={t('properties.optionDescription', 'Description')}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="multiSelect">{t('properties.multiSelect', 'Multi-select')}</Label>
            <Switch
              id="multiSelect"
              checked={node.data.multiSelect || false}
              onCheckedChange={(checked) => handleUpdate({ multiSelect: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="useAiSuggestions">{t('properties.useAiSuggestions', 'Use AI Suggestions')}</Label>
            <Switch
              id="useAiSuggestions"
              checked={node.data.useAiSuggestions || false}
              onCheckedChange={(checked) => handleUpdate({ useAiSuggestions: checked })}
            />
          </div>
        </>
      );

    case NodeType.Prompt:
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="label">{t('properties.label', 'Label')}</Label>
            <Input
              id="label"
              value={node.data.label || ''}
              onChange={(e) => handleUpdate({ label: e.target.value })}
              placeholder={t('properties.labelPlaceholder', 'Enter label')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt">{t('properties.prompt', 'Prompt')}</Label>
            <Textarea
              id="prompt"
              value={node.data.prompt}
              onChange={(e) => handleUpdate({ prompt: e.target.value })}
              placeholder={t('properties.promptPlaceholder', 'Enter prompt')}
              rows={6}
            />
          </div>
        </>
      );

    case NodeType.IfElse:
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="evaluationTarget">{t('properties.evaluationTarget', 'Evaluation Target')}</Label>
            <Input
              id="evaluationTarget"
              value={node.data.evaluationTarget || ''}
              onChange={(e) => handleUpdate({ evaluationTarget: e.target.value })}
              placeholder={t('properties.evaluationTargetPlaceholder', 'Variable to evaluate')}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('properties.branches', 'Branches')}</Label>
            {node.data.branches.map((branch, index) => (
              <div key={branch.id || index} className="border rounded p-2 space-y-2">
                <span className="text-xs font-medium">
                  {index === 0 ? t('properties.ifBranch', 'If') : t('properties.elseBranch', 'Else')}
                </span>
                {index === 0 && (
                  <Input
                    value={branch.condition}
                    onChange={(e) => {
                      const newBranches = [...node.data.branches];
                      newBranches[0] = { ...branch, condition: e.target.value };
                      handleUpdate({ branches: newBranches });
                    }}
                    placeholder={t('properties.conditionPlaceholder', 'Condition')}
                  />
                )}
              </div>
            ))}
          </div>
        </>
      );

    case NodeType.Switch:
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="evaluationTarget">{t('properties.evaluationTarget', 'Evaluation Target')}</Label>
            <Input
              id="evaluationTarget"
              value={node.data.evaluationTarget || ''}
              onChange={(e) => handleUpdate({ evaluationTarget: e.target.value })}
              placeholder={t('properties.evaluationTargetPlaceholder', 'Variable to evaluate')}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('properties.cases', 'Cases')}</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const newBranch = {
                    id: `case-${Date.now()}`,
                    label: '',
                    condition: '',
                  };
                  // Insert before the default branch (last one)
                  const newBranches = [...node.data.branches];
                  newBranches.splice(newBranches.length - 1, 0, newBranch);
                  handleUpdate({ branches: newBranches, outputPorts: newBranches.length });
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('properties.addCase', 'Add')}
              </Button>
            </div>
            {node.data.branches.map((branch, index) => (
              <div key={branch.id || index} className="border rounded p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {branch.isDefault ? t('properties.defaultCase', 'Default') : `Case ${index + 1}`}
                  </span>
                  {!branch.isDefault && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const newBranches = node.data.branches.filter((_, i) => i !== index);
                        handleUpdate({ branches: newBranches, outputPorts: newBranches.length });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {!branch.isDefault && (
                  <>
                    <Input
                      value={branch.label}
                      onChange={(e) => {
                        const newBranches = [...node.data.branches];
                        newBranches[index] = { ...branch, label: e.target.value };
                        handleUpdate({ branches: newBranches });
                      }}
                      placeholder={t('properties.caseLabel', 'Label')}
                    />
                    <Input
                      value={branch.condition}
                      onChange={(e) => {
                        const newBranches = [...node.data.branches];
                        newBranches[index] = { ...branch, condition: e.target.value };
                        handleUpdate({ branches: newBranches });
                      }}
                      placeholder={t('properties.conditionPlaceholder', 'Condition')}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      );

    case NodeType.Skill:
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="skillName">{t('properties.skillName', 'Skill Name')}</Label>
            <Input
              id="skillName"
              value={node.data.name}
              onChange={(e) => handleUpdate({ name: e.target.value })}
              placeholder={t('properties.skillNamePlaceholder', 'Enter skill name')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skillDescription">{t('properties.description', 'Description')}</Label>
            <Textarea
              id="skillDescription"
              value={node.data.description}
              onChange={(e) => handleUpdate({ description: e.target.value })}
              placeholder={t('properties.descriptionPlaceholder', 'Brief description')}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skillPath">{t('properties.skillPath', 'Skill Path')}</Label>
            <Input
              id="skillPath"
              value={node.data.skillPath}
              onChange={(e) => handleUpdate({ skillPath: e.target.value })}
              placeholder={t('properties.skillPathPlaceholder', 'Path to skill file')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scope">{t('properties.scope', 'Scope')}</Label>
            <Select
              value={node.data.scope}
              onValueChange={(value) => handleUpdate({ scope: value as any })}
            >
              <SelectTrigger id="scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t('properties.scopeUser', 'User')}</SelectItem>
                <SelectItem value="project">{t('properties.scopeProject', 'Project')}</SelectItem>
                <SelectItem value="local">{t('properties.scopeLocal', 'Local')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="allowedTools">{t('properties.allowedTools', 'Allowed Tools')}</Label>
            <Input
              id="allowedTools"
              value={node.data.allowedTools || ''}
              onChange={(e) => handleUpdate({ allowedTools: e.target.value })}
              placeholder={t('properties.allowedToolsPlaceholder', 'Comma-separated tool names')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validationStatus">{t('properties.validationStatus', 'Validation Status')}</Label>
            <Select
              value={node.data.validationStatus || 'valid'}
              onValueChange={(value) => handleUpdate({ validationStatus: value as any })}
            >
              <SelectTrigger id="validationStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="valid">{t('properties.validationValid', 'Valid')}</SelectItem>
                <SelectItem value="missing">{t('properties.validationMissing', 'Missing')}</SelectItem>
                <SelectItem value="invalid">{t('properties.validationInvalid', 'Invalid')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );

    case NodeType.Mcp:
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="serverId">{t('properties.serverId', 'Server ID')}</Label>
            <Input
              id="serverId"
              value={node.data.serverId}
              onChange={(e) => handleUpdate({ serverId: e.target.value })}
              placeholder={t('properties.serverIdPlaceholder', 'MCP server ID')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="toolName">{t('properties.toolName', 'Tool Name')}</Label>
            <Input
              id="toolName"
              value={node.data.toolName || ''}
              onChange={(e) => handleUpdate({ toolName: e.target.value })}
              placeholder={t('properties.toolNamePlaceholder', 'Tool name')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mode">{t('properties.mode', 'Mode')}</Label>
            <Select
              value={node.data.mode || 'manualParameterConfig'}
              onValueChange={(value) => handleUpdate({ mode: value as any })}
            >
              <SelectTrigger id="mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manualParameterConfig">
                  {t('properties.modeManual', 'Manual Parameter Config')}
                </SelectItem>
                <SelectItem value="aiParameterConfig">
                  {t('properties.modeAiParameter', 'AI Parameter Config')}
                </SelectItem>
                <SelectItem value="aiToolSelection">
                  {t('properties.modeAiTool', 'AI Tool Selection')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mode-specific fields */}
          {node.data.mode === 'aiToolSelection' && (
            <div className="space-y-2">
              <Label htmlFor="taskDescription">{t('properties.taskDescription', 'Task Description')}</Label>
              <Textarea
                id="taskDescription"
                value={node.data.aiToolSelectionConfig?.taskDescription || ''}
                onChange={(e) => handleUpdate({
                  aiToolSelectionConfig: {
                    ...node.data.aiToolSelectionConfig,
                    taskDescription: e.target.value,
                  },
                })}
                placeholder={t('properties.taskDescriptionPlaceholder', 'Describe the task for AI')}
                rows={3}
              />
            </div>
          )}

          {node.data.mode === 'aiParameterConfig' && (
            <div className="space-y-2">
              <Label htmlFor="paramDescription">{t('properties.paramDescription', 'Parameter Description')}</Label>
              <Textarea
                id="paramDescription"
                value={node.data.aiParameterConfig?.description || ''}
                onChange={(e) => handleUpdate({
                  aiParameterConfig: {
                    ...node.data.aiParameterConfig,
                    description: e.target.value,
                  },
                })}
                placeholder={t('properties.paramDescriptionPlaceholder', 'Describe parameters for AI')}
                rows={3}
              />
            </div>
          )}

          {node.data.mode === 'manualParameterConfig' && (
            <div className="space-y-2">
              <Label htmlFor="parameters">{t('properties.parameters', 'Parameters (JSON)')}</Label>
              <Textarea
                id="parameters"
                value={JSON.stringify(node.data.parameterValues || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleUpdate({ parameterValues: parsed });
                  } catch (err) {
                    // Invalid JSON, don't update
                }
                }}
                placeholder={t('properties.parametersPlaceholder', '{"key": "value"}')}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="validationStatus">{t('properties.validationStatus', 'Validation Status')}</Label>
            <Select
              value={node.data.validationStatus || 'valid'}
              onValueChange={(value) => handleUpdate({ validationStatus: value as any })}
            >
              <SelectTrigger id="validationStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="valid">{t('properties.validationValid', 'Valid')}</SelectItem>
                <SelectItem value="missing">{t('properties.validationMissing', 'Missing')}</SelectItem>
                <SelectItem value="invalid">{t('properties.validationInvalid', 'Invalid')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );

    case NodeType.Start:
    case NodeType.End:
      return (
        <div className="space-y-2">
          <Label htmlFor="label">{t('properties.label', 'Label')}</Label>
          <Input
            id="label"
            value={node.data.label || ''}
            onChange={(e) => handleUpdate({ label: e.target.value })}
            placeholder={t('properties.labelPlaceholder', 'Enter label')}
          />
        </div>
      );

    case NodeType.SubAgentFlow:
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="label">{t('properties.label', 'Label')}</Label>
            <Input
              id="label"
              value={node.data.label}
              onChange={(e) => handleUpdate({ label: e.target.value })}
              placeholder={t('properties.labelPlaceholder', 'Enter label')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('properties.description', 'Description')}</Label>
            <Textarea
              id="description"
              value={node.data.description || ''}
              onChange={(e) => handleUpdate({ description: e.target.value })}
              placeholder={t('properties.descriptionPlaceholder', 'Brief description')}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subAgentFlowId">{t('properties.subAgentFlowId', 'Sub-Agent Flow ID')}</Label>
            <Input
              id="subAgentFlowId"
              value={node.data.subAgentFlowId}
              onChange={(e) => handleUpdate({ subAgentFlowId: e.target.value })}
              placeholder={t('properties.subAgentFlowIdPlaceholder', 'Flow ID')}
            />
          </div>
        </>
      );

    default:
      return (
        <div className="text-sm text-muted-foreground">
          {t('properties.noPropertiesAvailable', 'No properties available for this node type')}
        </div>
      );
  }
}
