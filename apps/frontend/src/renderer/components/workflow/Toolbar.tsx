/**
 * Toolbar Component
 * =================
 *
 * Main toolbar for workflow studio with all controls.
 */

import React, { useState } from 'react';
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
  onStartTour?: () => void;
  onToggleFocusMode?: () => void;
  isFocusMode?: boolean;
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
  onStartTour,
  onToggleFocusMode,
  isFocusMode = false,
  slashCommandOptions = {},
  onSlashCommandOptionsChange,
  hasUnsavedChanges = false,
  isExecuting = false,
  disabled = false,
  className,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    setProcessingMessage('Saving workflow...');
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
    setProcessingMessage('Loading workflow...');
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
    setProcessingMessage('Exporting workflow...');
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
    setProcessingMessage('Generating workflow name...');
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
            placeholder="Untitled Workflow"
            maxLength={100}
            onValidate={(value) => {
              if (value.length < 3) {
                return 'Name must be at least 3 characters';
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
            <span className="text-xs text-muted-foreground">• Unsaved</span>
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
            <span>Save</span>
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
            <span>Load</span>
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
            <span>Export</span>
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
            <span>AI Refine</span>
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* More Actions */}
        <MoreActionsDropdown
          onNewWorkflow={onNewWorkflow}
          onReset={onReset ? () => setShowResetConfirm(true) : undefined}
          onStartTour={onStartTour}
          onToggleFocusMode={onToggleFocusMode}
          isFocusMode={isFocusMode}
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
        title="Reset Workflow"
        message="Are you sure you want to reset the workflow? All unsaved changes will be lost."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleReset}
      />
    </>
  );
};
