/**
 * AI Optimization Panel
 * ======================
 *
 * Panel for iterative workflow optimization through AI conversation.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  Sparkles,
  User,
  Bot,
  CheckCircle,
  XCircle,
  Lightbulb,
  Settings,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useAIOptimizationStore } from '@/stores/ai-optimization-store';
import { IPC_CHANNELS } from '../../../shared/constants/ipc';

const { ipcRenderer } = window.Electron;

interface AIOptimizationPanelProps {
  workflow: any;
  projectPath: string;
  onWorkflowUpdated: (workflow: any) => void;
}

export function AIOptimizationPanel({
  workflow,
  projectPath,
  onWorkflowUpdated,
}: AIOptimizationPanelProps) {
  const { sessions, addMessage, getSession, startSession, clearSession } = useAIOptimizationStore();
  const [input, setInput] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [retryingMessageIndex, setRetryingMessageIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const workflowId = workflow?.id;
  const session = workflowId ? getSession(workflowId) : undefined;

  // Warning threshold for long conversations
  const CONVERSATION_WARNING_THRESHOLD = 20;

  // Initialize session if needed
  useEffect(() => {
    if (workflowId && !session) {
      startSession(workflowId);
    }
  }, [workflowId, session, startSession]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages]);

  // Load suggestions on mount
  useEffect(() => {
    if (workflowId && !suggestions.length) {
      loadSuggestions();
    }
  }, [workflowId]);

  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_AI_SUGGEST, {
        workflow,
        projectPath,
      });

      if (result.success) {
        setSuggestions(result.suggestions || []);
      }
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleOptimize = async () => {
    if (!input.trim() || !workflowId) return;

    const userMessage = {
      role: 'user' as const,
      content: input.trim(),
      timestamp: Date.now(),
    };

    // Add user message
    addMessage(workflowId, userMessage);
    setInput('');
    setIsOptimizing(true);
    setError(null);

    try {
      // Get conversation history
      const conversationHistory = session?.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })) || [];

      // Call optimization API
      const result = await ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_AI_OPTIMIZE, {
        workflow,
        optimizationRequest: userMessage.content,
        conversationHistory,
        projectPath,
      });

      if (result.success) {
        // Add assistant response
        const assistantMessage = {
          role: 'assistant' as const,
          content: result.summary || 'Workflow optimized successfully',
          timestamp: Date.now(),
        };
        addMessage(workflowId, assistantMessage);

        // Update workflow
        onWorkflowUpdated(result.workflow);

        // Reload suggestions
        loadSuggestions();
      } else {
        setError(result.error || 'Optimization failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setInput(suggestion.description || suggestion.message || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isOptimizing) {
      e.preventDefault();
      handleOptimize();
    }
  };

  const handleClearConversation = () => {
    setIsClearDialogOpen(true);
  };

  const confirmClearConversation = () => {
    if (workflowId) {
      clearSession(workflowId);
      setSuggestions([]);
      setError(null);
    }
    setIsClearDialogOpen(false);
  };

  const handleRetry = async (messageIndex: number) => {
    if (!workflowId || !session) return;

    // Find the user message that triggered this response
    const messages = session.messages;
    if (messageIndex <= 0 || messageIndex >= messages.length) return;

    const userMessage = messages[messageIndex - 1];
    if (userMessage.role !== 'user') return;

    setRetryingMessageIndex(messageIndex);
    setError(null);

    try {
      // Get conversation history up to the failed message
      const conversationHistory = messages.slice(0, messageIndex).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Call optimization API
      const result = await ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_AI_OPTIMIZE, {
        workflow,
        optimizationRequest: userMessage.content,
        conversationHistory,
        projectPath,
      });

      if (result.success) {
        // Update the failed message with new response
        const updatedMessages = [...messages];
        updatedMessages[messageIndex] = {
          role: 'assistant' as const,
          content: result.summary || 'Workflow optimized successfully',
          timestamp: Date.now(),
        };

        // Update session with new messages
        clearSession(workflowId);
        updatedMessages.forEach((msg) => addMessage(workflowId, msg));

        // Update workflow
        onWorkflowUpdated(result.workflow);

        // Reload suggestions
        loadSuggestions();
      } else {
        setError(result.error || 'Retry failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setRetryingMessageIndex(null);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI Workflow Optimizer
              </CardTitle>
              <CardDescription>
                Chat with AI to iteratively improve your workflow
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleClearConversation}
                  disabled={!session?.messages.length}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
      </Card>

      {/* Warning Banner for Long Conversations */}
      {session && session.messages.length >= CONVERSATION_WARNING_THRESHOLD && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This conversation has {session.messages.length} messages. Consider starting a new
            conversation for better performance.
          </AlertDescription>
        </Alert>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestions.slice(0, 3).map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={suggestion.priority === 'high' ? 'destructive' : 'secondary'}>
                        {suggestion.priority || 'medium'}
                      </Badge>
                      <span className="font-medium text-sm">{suggestion.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.description?.substring(0, 100)}...
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversation */}
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="text-sm">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="space-y-4 py-4">
              {session?.messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <p>Start a conversation to optimize your workflow</p>
                  <p className="text-sm mt-2">
                    Try: "Make this workflow more efficient" or "Add error handling"
                  </p>
                </div>
              )}

              {session?.messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1 max-w-[80%]">
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>

                    {/* Retry button for assistant messages with errors */}
                    {message.role === 'assistant' && index > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start h-6 px-2 text-xs"
                        onClick={() => handleRetry(index)}
                        disabled={retryingMessageIndex === index}
                      >
                        {retryingMessageIndex === index ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </>
                        )}
                      </Button>
                    )}
             </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isOptimizing && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Input */}
          <div className="p-4 space-y-2">
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Textarea
                placeholder="Describe how you want to optimize the workflow..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                disabled={isOptimizing}
                className="resize-none"
              />
              <Button
                onClick={handleOptimize}
                disabled={!input.trim() || isOptimizing}
                size="icon"
              className="flex-shrink-0"
              >
                {isOptimizing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clear Conversation Confirmation Dialog */}
      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear the conversation history? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmClearConversation}>
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
