/**
 * AI Generation Dialog
 * ====================
 *
 * Dialog for generating workflows from natural language descriptions.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { IPC_CHANNELS } from '../../../shared/constants/ipc';

const { ipcRenderer } = window.Electron;

interface AIGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkflowGenerated: (workflow: any) => void;
  projectPath: string;
}

export function AIGenerationDialog({
  open,
  onOpenChange,
  onWorkflowGenerated,
  projectPath,
}: AIGenerationDialogProps) {
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please provide a workflow description');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_AI_GENERATE, {
        description: description.trim(),
        context: context.trim(),
        projectPath,
      });

      if (response.success) {
        setResult(response);
        // Auto-apply after 2 seconds if user doesn't cancel
        setTimeout(() => {
          if (result?.success) {
            handleApply();
          }
        }, 2000);
      } else {
        setError(response.error || 'Failed to generate workflow');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (result?.workflow) {
      onWorkflowGenerated(result.workflow);
      handleClose();
    }
  };

  const handleClose = () => {
    setDescription('');
    setContext('');
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  const handleTryAgain = () => {
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Workflow Generator
          </DialogTitle>
          <DialogDescription>
            Describe your workflow in natural language, and AI will generate it for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description Input */}
          {!result && (
            <>
              <div className="space-y-2">
                <Label htmlFor="description">
                  Workflow Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Example: Create a workflow that fetches data from an API, processes it with a Python script, and sends the results to Slack..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  disabled={isGenerating}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  Be specific about the steps, tools, and logic you want.
                </p>
              </div>

              {/* Context Input (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="context">Additional Context (Optional)</Label>
                <Textarea
                  id="context"
                  placeholder="Example: Use the GitHub MCP server for API calls, handle errors gracefully..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={3}
                  disabled={isGenerating}
                  className="resize-none"
                />
              </div>
            </>
          )}

          {/* Generation Progress */}
          {isGenerating && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Generating workflow... This may take a minute.
              </AlertDescription>
            </Alert>
          )}

          {/* Success Result */}
          {result?.success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <div className="space-y-2">
                  <p className="font-medium">Workflow generated successfully!</p>
                  <div className="text-sm space-y-1">
                    <p>Name: <span className="font-mono">{result.workflow?.name}</span></p>
                    <p>Nodes: {result.workflow?.nodes?.length || 0}</p>
                    <p>Iterations: {result.iterations}</p>
                  </div>
                  {result.suggestions?.length > 0 && (
               <div className="mt-2 text-sm">
                      <p className="font-medium">Suggestions:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {result.suggestions.map((s: any, i: number) => (
                          <li key={i}>{s.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!description.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </>
          ) : result.success ? (
            <>
              <Button variant="outline" onClick={handleTryAgain}>
                Try Again
              </Button>
              <Button onClick={handleApply}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Apply Workflow
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleTryAgain}>
                Try Again
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
