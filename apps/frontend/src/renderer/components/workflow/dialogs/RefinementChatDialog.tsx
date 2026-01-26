/**
 * Refinement Chat Dialog Component
 * =================================
 *
 * Full-screen dialog for AI-powered workflow refinement chat.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { X, Sparkles } from 'lucide-react';
import {
  MessageList,
  MessageInput,
  SettingsDropdown,
  WarningBanner,
  Message,
} from '../chat';
import { cn } from '../../../lib/utils';

interface RefinementChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowName?: string;
  onSendMessage: (message: string) => Promise<void>;
  messages: Message[];
  onRetry?: (messageIndex: number) => void;
  onClearConversation?: () => void;
  onExportConversation?: () => void;
  isLoading?: boolean;
  className?: string;
}

const CONVERSATION_WARNING_THRESHOLD = 20;

export const RefinementChatDialog: React.FC<RefinementChatDialogProps> = ({
  open,
  onOpenChange,
  workflowName = 'Untitled Workflow',
  onSendMessage,
  messages,
  onRetry,
  onClearConversation,
  onExportConversation,
  isLoading = false,
  className,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [showWarning, setShowWarning] = useState(true);

  const handleSend = async (message: string) => {
    setIsSending(true);
    try {
      await onSendMessage(message);
    } finally {
      setIsSending(false);
    }
  };

  const showConversationWarning =
    showWarning && messages.length >= CONVERSATION_WARNING_THRESHOLD;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-[90vw] h-[90vh] flex flex-col p-0',
          className
        )}
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <DialogTitle>Refine Workflow: {workflowName}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <SettingsDropdown
                onClearConversation={onClearConversation}
                onExportConversation={onExportConversation}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Warning Banner */}
        {showConversationWarning && (
          <div className="px-6 pt-4 shrink-0">
            <WarningBanner
              type="warning"
              message={`This conversation has ${messages.length} messages. Consider starting a new conversation for better performance.`}
              action={{
                label: 'Clear Conversation',
                onClick: () => onClearConversation?.(),
              }}
              onDismiss={() => setShowWarning(false)}
            />
          </div>
        )}

        {/* Message List */}
        <MessageList
          messages={messages}
          onRetry={onRetry}
          isLoading={isLoading}
          emptyMessage="Start a conversation to refine your workflow with AI assistance."
          className="flex-1"
        />

        {/* Message Input */}
        <div className="px-6 py-4 border-t shrink-0">
          <MessageInput
            onSend={handleSend}
            disabled={isSending || isLoading}
            placeholder="Describe how you want to improve the workflow..."
            maxLength={2000}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
