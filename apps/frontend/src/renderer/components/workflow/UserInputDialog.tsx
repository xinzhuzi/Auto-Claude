/**
 * User Input Dialog
 * ==================
 *
 * Dialog component for collecting user input during workflow execution.
 * Supports text input, single/multi-select options.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUserInputStore } from '@/stores/user-input-store';

export function UserInputDialog() {
  const { currentRequest, removeRequest } = useUserInputStore();
  const [textInput, setTextInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when request changes
  useEffect(() => {
    setTextInput('');
    setSelectedOptions([]);
    setIsSubmitting(false);
  }, [currentRequest?.requestId]);

  // Listen for user input requests from main process
  useEffect(() => {
    const handleUserInputRequest = (request: any) => {
      useUserInputStore.getState().addRequest({
        requestId: request.requestId,
        question: request.question,
        options: request.options || [],
        multiSelect: request.multiSelect || false,
        timestamp: Date.now(),
      });
    };

    const cleanup = window.electronAPI.workflow.onUserInputRequest(handleUserInputRequest);

    return () => {
      cleanup();
    };
  }, []);

  const handleSubmit = async () => {
    if (!currentRequest) return;

    setIsSubmitting(true);

    try {
      // Determine response based on input type
      let response: any;

      if (currentRequest.options.length > 0) {
        // Options provided - use selected options
        response = currentRequest.multiSelect ? selectedOptions : selectedOptions[0];
      } else {
        // No options - use text input
        response = textInput;
      }

      // Send response to main process
      await window.electronAPI.workflow.submitUserInput({
        requestId: currentRequest.requestId,
        response,
        cancelled: false,
      });

      // Remove request from store
      removeRequest(currentRequest.requestId);
    } catch (error) {
      console.error('Failed to submit user input:', error);
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!currentRequest) return;

    setIsSubmitting(true);

    try {
      // Send cancellation to main process
      await window.electronAPI.workflow.cancelUserInput(currentRequest.requestId);

      // Remove request from store
      removeRequest(currentRequest.requestId);
    } catch (error) {
      console.error('Failed to cancel user input:', error);
      setIsSubmitting(false);
    }
  };

  const handleOptionChange = (option: string, checked: boolean) => {
    if (currentRequest?.multiSelect) {
      // Multi-select: add/remove from array
      setSelectedOptions((prev) =>
        checked ? [...prev, option] : prev.filter((o) => o !== option)
      );
    } else {
      // Single-select: replace array
      setSelectedOptions(checked ? [option] : []);
    }
  };

  // Validation
  const isValid = () => {
    if (currentRequest?.options && currentRequest.options.length > 0) {
      return selectedOptions.length > 0;
    } else {
      return textInput.trim().length > 0;
    }
  };

  if (!currentRequest) {
    return null;
  }

  return (
    <Dialog open={!!currentRequest} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>🙋 等待您的输入</DialogTitle>
          <DialogDescription>
            工作流正在等待您的选择或输入后继续执行
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Question */}
          <div className="space-y-2">
            <Label className="text-base font-medium">{currentRequest.question}</Label>
          </div>

          {/* Input based on type */}
          {currentRequest.options.length > 0 ? (
            // Optio
            <div className="space-y-3">
              {currentRequest.multiSelect ? (
                // Multi-select checkboxes
                <div className="space-y-2">
                  {currentRequest.options.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`option-${option}`}
                        checked={selectedOptions.includes(option)}
                        onCheckedChange={(checked) =>
                          handleOptionChange(option, checked as boolean)
                        }
                        disabled={isSubmitting}
                      />
                      <Label
                        htmlFor={`option-${option}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                // Single-select radio buttons
                <RadioGroup
                  value={selectedOptions[0] || ''}
                  onValueChange={(value) => setSelectedOptions([value])}
                  disabled={isSubmitting}
                >
                  {currentRequest.options.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`radio-${option}`} />
                      <Label
                        htmlFor={`radio-${option}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          ) : (
            // Text input
            <div className="space-y-2">
              <Input
                placeholder="请输入您的回复..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && isValid()) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid() || isSubmitting}
          >
            {isSubmitting ? '提交中...' : '确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
