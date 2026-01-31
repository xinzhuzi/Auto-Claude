/**
 * Toolbar Component
 * =================
 *
 * Main toolbar for workflow studio with all controls.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import {
  Save,
  FolderOpen,
  Download,
  Play,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { EditableNameField } from './common/EditableNameField';
import { AiGenerateButton } from './common/AiGenerateButton';
import { ProcessingOverlay } from './common/ProcessingOverlay';
import { ConfirmDialog } from './dialogs/ConfirmDialog';
import {
  SlashCommandOptionsDropdown,
  SlashCommandOptions,
} from './toolbar/SlashCommandOptionsDropdown';
import { MoreActionsDropdown } from './toolbar/MoreActionsDropdown';

interface ToolbarProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  onGenerateWorkflowName?: () => Promise<void>;
  onSave: () => Promise<void>;
  onLoad: () => Promise<void>;
  onExport: () => Promise<void>;
  onNewWorkflow?: () => void;
  onAiRefine?: () => void;
  onReset?: () => void;
  onClose?: () => void;
  onStartTour?: () => void;
  onToggleFocusMode?: () => void;
  onTogglePropertyPanel?: () => void;
  onToggleExecutionPanel?: () => void;
  isFocusMode?: boolean;
  isPropertyPanelOpen?: boolean;
  isExecutionPanelOpen?: boolean;
  slashCommandOptions?: SlashCommandOptions;
  onSlashCommandOptionsChange?: (options: SlashCommandOptions) => void;
  hasUnsavedChanges?: boolean;
  isExecuting?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  workflowName,
  onWorkflowNameChange,
  onGenerateWorkflowName,
  onSave,
  onLoad,
  onExport,
  onNewWorkflow,
  onAiRefine,
  onReset,
  onClose,
  onStartTour,
  onToggleFocusMode,
  onTogglePropertyPanel,
  onToggleExecutionPanel,
  isFocusMode = false,
  isPropertyPanelOpen = false,
  isExecutionPanelOpen = true,
  slashCommandOptions = {},
  onSlashCommandOptionsChange,
  hasUnsavedChanges = false,
  isExecuting = false,
  disabled = false,
  className,
}) => {
  const { t } = useTranslation('workflowStudio');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    setProcessingMessage(t('saving'));
    try {
      await onSave();
    } finally {
      setIsSaving(false);
      setProcessingMessage('');
    }
  };

  // Handle load
  const handleLoad = async () => {
    setIsLoading(true);
    setProcessingMessage(t('importWorkflow'));
    try {
      await onLoad();
    } finally {
      setIsLoading(false);
      setProcessingMessage('');
    }
  };

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    setProcessingMessage(t('exporting'));
    try {
      await onExport();
    } finally {
      setIsExporting(false);
      setProcessingMessage('');
    }
  };

  // Handle generate workflow name
  const handleGenerateWorkflowName = async () => {
    if (!onGenerateWorkflowName) return;

    setIsGeneratingName(true);
    setProcessingMessage(t('aiProcessing'));
    try {
      await onGenerateWorkflowName();
    } finally {
      setIsGeneratingName(false);
      setProcessingMessage('');
    }
  };

  // Handle reset
  const handleReset = () => {
    if (onReset) {
      onReset();
      setShowResetConfirm(false);
    }
  };

  const isProcessing = isSaving || isLoading || isExporting || isGeneratingName;
  const isDisabled = disabled || isProcessing || isExecuting;

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 border-b bg-card',
          className
        )}
      >
        {/* Workflow Name */}
        <div className="flex items-center gap-2">
          <EditableNameField
            value={workflowName}
            onChange={onWorkflowNameChange}
            placeholder={t('workflowNamePlaceholder')}
            maxLength={100}
            onValidate={(value) => {
              if (value.length < 3) {
                return t('toolbar.namePatternError');
              }
              return null;
            }}
          />
          {onGenerateWorkflowName && (
            <AiGenerateButton
              onClick={handleGenerateWorkflowName}
              isLoading={isGeneratingName}
              disabled={isDisabled}
              size="icon"
              variant="ghost"
            />
          )}
          {hasUnsavedChanges && (
            <span className="text-xs text-muted-foreground">• {t('toolbar.unsaved', '未保存')}</span>
          )}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* File Operations */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={isDisabled}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{t('save')}</span>
          </Button>

          <Button
            onClick={handleLoad}
            disabled={isDisabled}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderOpen className="h-4 w-4" />
            )}
            <span>{t('load')}</span>
          </Button>

          <Button
            onClick={handleExport}
            disabled={isDisabled}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{t('export')}</span>
          </Button>
        </div>

        {/* Slash Command Options */}
        {onSlashCommandOptionsChange && (
          <SlashCommandOptionsDropdown
            options={slashCommandOptions}
            onChange={onSlashCommandOptionsChange}
            disabled={isDisabled}
          />
        )}

        <Separator orientation="vertical" className="h-6" />

        {/* AI Refine */}
        {onAiRefine && (
          <Button
            onClick={onAiRefine}
            disabled={isDisabled}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>{t('refineButton')}</span>
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* More Actions */}
        <MoreActionsDropdown
          onNewWorkflow={onNewWorkflow}
          onReset={onReset ? () => setShowResetConfirm(true) : undefined}
          onClose={onClose}
          onStartTour={onStartTour}
          onToggleFocusMode={onToggleFocusMode}
          onTogglePropertyPanel={onTogglePropertyPanel}
          onToggleExecutionPanel={onToggleExecutionPanel}
          isFocusMode={isFocusMode}
          isPropertyPanelOpen={isPropertyPanelOpen}
          isExecutionPanelOpen={isExecutionPanelOpen}
          disabled={isDisabled}
        />
      </div>

      {/* Processing Overlay */}
      <ProcessingOverlay
        visible={isProcessing}
        message={processingMessage}
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title={t('resetWorkflow')}
        message={t('toolbar.resetConfirmMessage', '确定要重置工作流吗？所有未保存的更改将丢失。')}
        confirmLabel={t('confirm')}
        cancelLabel={t('cancel')}
        variant="destructive"
        onConfirm={handleReset}
      />
    </>
  );
};
