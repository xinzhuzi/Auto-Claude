/**
 * Message List Component
 * ======================
 *
 * Container for displaying chat messages with auto-scroll.
 */

import React, { useRef, useEffect } from 'react';
import { MessageBubble, Message } from './MessageBubble';
import { Spinner } from '../common/Spinner';
import { cn } from '../../../lib/utils';

interface MessageListProps {
  messages: Message[];
  onRetry?: (messageIndex: number) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onRetry,
  isLoading = false,
  emptyMessage = 'No messages yet. Start a conversation!',
  className,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle retry with message index
  const handleRetry = (messageId: string) => {
    if (onRetry) {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex !== -1) {
        onRetry(messageIndex);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex-1 overflow-y-auto p-4 space-y-2',
        className
      )}
    >
      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )}

      {/* Messages */}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onRetry={onRetry ? () => handleRetry(message.id) : undefined}
        />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Spinner size="sm" />
          <span className="ml-2 text-sm text-muted-foreground">
            AI is thinking...
          </span>
        </div>
      )}

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};
