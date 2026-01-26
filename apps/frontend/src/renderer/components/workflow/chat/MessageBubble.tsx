/**
 * Message Bubble Component
 * ========================
 *
 * Displays a single message in the chat interface.
 */

import React from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { User, Bot, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ToolExecutionIndicator } from './ToolExecutionIndicator';
import { Spinner } from '../common/Spinner';

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isLoading?: boolean;
  isError?: boolean;
  errorCode?: string;
  toolInfo?: string | null;
}

interface MessageBubbleProps {
  message: Message;
  onRetry?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onRetry }) => {
  const isUser = message.sender === 'user';
  const isError = message.isError ?? false;
  const isLoading = (message.isLoading ?? false) && !isError;

  return (
    <div className={cn('flex mb-3', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-3 py-2',
          isError
            ? 'bg-destructive/10 border border-destructive text-destructive'
            : isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
        )}
      >
        {/* Sender Label */}
        <div className="flex items-center gap-2 mb-1 opacity-70">
          {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
          <span className="text-xs font-medium">{isUser ? 'User' : 'AI'}</span>
        </div>

        {/* Error State */}
        {isError && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Error occurred</span>
            </div>
            {message.errorCode && (
              <Badge variant="outline" className="text-xs">
                {message.errorCode}
              </Badge>
            )}
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-2 gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center gap-2">
            <Spinner size="sm" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        {/* Tool Execution Indicator */}
        {message.toolInfo && !isError && (
          <div className="mb-2">
            <ToolExecutionIndicator toolInfo={message.toolInfo} />
          </div>
        )}

        {/* Message Content */}
        {!isLoading && !isError && (
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs opacity-50 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
