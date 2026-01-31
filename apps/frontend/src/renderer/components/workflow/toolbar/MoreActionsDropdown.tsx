/**
 * More Actions Dropdown Component
 * ================================
 *
 * Dropdown menu for additional workflow actions.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Button } from '../../ui/button';
import { MoreVertical, RotateCcw, HelpCircle, Maximize2, Minimize2, FilePlus, X, PanelRight, Terminal } from 'lucide-react';

interface MoreActionsDropdownProps {
  onNewWorkflow?: () => void;
  onReset?: () => void;
  onStartTour?: () => void;
  onToggleFocusMode?: () => void;
  onClose?: () => void;
  onTogglePropertyPanel?: () => void;
  onToggleExecutionPanel?: () => void;
  isPropertyPanelOpen?: boolean;
  isExecutionPanelOpen?: boolean;
  isFocusMode?: boolean;
  disabled?: boolean;
}

export const MoreActionsDropdown: React.FC<MoreActionsDropdownProps> = ({
  onNewWorkflow,
  onReset,
  onStartTour,
  onToggleFocusMode,
  onClose,
  onTogglePropertyPanel,
  onToggleExecutionPanel,
  isPropertyPanelOpen = false,
  isExecutionPanelOpen = true,
  isFocusMode = false,
  disabled = false,
}) => {
  const { t } = useTranslation('workflowStudio');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t('toolbar.moreActions')}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* New Workflow */}
        {onNewWorkflow && (
          <DropdownMenuItem onClick={onNewWorkflow}>
            <FilePlus className="mr-2 h-4 w-4" />
            <span>{t('toolbar.newWorkflow')}</span>
          </DropdownMenuItem>
        )}

        {/* Start Tour */}
        {onStartTour && (
          <DropdownMenuItem onClick={onStartTour}>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>{t('toolbar.startTour')}</span>
          </DropdownMenuItem>
        )}

        {/* Toggle Focus Mode */}
        {onToggleFocusMode && (
          <DropdownMenuItem onClick={onToggleFocusMode}>
            {isFocusMode ? (
              <>
                <Minimize2 className="mr-2 h-4 w-4" />
                <span>{t('toolbar.exitFocusMode')}</span>
              </>
            ) : (
              <>
                <Maximize2 className="mr-2 h-4 w-4" />
                <span>{t('toolbar.enterFocusMode')}</span>
              </>
            )}
          </DropdownMenuItem>
        )}

        {/* Panel Toggles */}
        <DropdownMenuSeparator />
        {onTogglePropertyPanel && (
          <DropdownMenuItem onClick={onTogglePropertyPanel}>
            <PanelRight className="mr-2 h-4 w-4" />
            <span>{isPropertyPanelOpen ? t('toolbar.hidePropertyPanel') : t('toolbar.showPropertyPanel')}</span>
          </DropdownMenuItem>
        )}
        {onToggleExecutionPanel && (
          <DropdownMenuItem onClick={onToggleExecutionPanel}>
            <Terminal className="mr-2 h-4 w-4" />
            <span>{isExecutionPanelOpen ? t('toolbar.hideExecutionPanel') : t('toolbar.showExecutionPanel')}</span>
          </DropdownMenuItem>
        )}

        {/* Reset Workflow */}
        {onReset && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onReset}
              className="text-destructive focus:text-destructive"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              <span>{t('resetWorkflow')}</span>
            </DropdownMenuItem>
          </>
        )}

        {/* Close Workflow */}
        {onClose && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              <span>{t('toolbar.closeWorkflow')}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
