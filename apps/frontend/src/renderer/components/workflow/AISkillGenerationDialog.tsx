/**
 * AI Skill Generation Dialog
 * ===========================
 *
 * Dialog for generating Claude skill definitions from natural language descriptions.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Sparkles, CheckCircle, XCircle, FileText, Copy } from 'lucide-react';

interface AISkillGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
}

interface GenerationResult {
  success: boolean;
  skill_markdown?: string;
  skill_path?: string;
  metadata?: {
    name: string;
    description: string;
    triggers: string[];
  };
  error?: string;
  validation_errors?: string[];
}

export function AISkillGenerationDialog({
  open,
  onOpenChange,
  projectPath,
}: AISkillGenerationDialogProps) {
  const [skillName, setSkillName] = useState('');
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!skillName.trim() || !description.trim()) {
      setError('Skill name and description are required');
      return;
    }

    // Validate skill name format
    if (!/^[a-z0-9_-]+$/.test(skillName)) {
      setError('Skill name must be lowercase alphanumeric with hyphens/underscores only');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await window.electronAPI.workflow.aiGenerateSkill({
        description: description.trim(),
        skillName: skillName.trim(),
        context: context.trim(),
        projectPath,
        overwrite,
      });

      if (response.success) {
        setResult(response);
      } else {
        setError(response.error || 'Skill generation failed');
        setResult(response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (result?.skill_markdown) {
      navigator.clipboard.writeText(result.skill_markdown);
    }
  };

  const handleReset = () => {
    setSkillName('');
    setDescription('');
    setContext('');
    setOverwrite(false);
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Generate Claude Skill
          </DialogTitle>
          <DialogDescription>
            Create a new Claude skill from a natural language description
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {!result ? (
            // Input Form
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                {/* Skill Name */}
                <div className="space-y-2">
                  <Label htmlFor="skill-name">
                    Skill Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="skill-name"
                    placeholder="my-skill-name"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value.toLowerCase())}
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lowercase alphanumeric with hyphens/underscores only
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this skill should do..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Be specific about the skill's purpose, when to use it, and what it should accomplish
                  </p>
                </div>

                {/* Context (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="context">Additional Context (Optional)</Label>
                  <Textarea
                    id="context"
                    placeholder="Any additional context or requirements..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={3}
                    disabled={isGenerating}
                  />
                </div>

                {/* Overwrite Option */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="overwrite"
                    checked={overwrite}
                    onChange={(e) => setOverwrite(e.target.checked)}
                    disabled={isGenerating}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="overwrite" className="text-sm font-normal cursor-pointer">
                    Overwrite existing skill if it exists
                  </Label>
                </div>

                {/* Error Display */}
                {error && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          ) : (
            // Result Display
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                {/* Success/Error Status */}
                {result.success ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription>
                      Skill generated successfully and saved to{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {result.skill_path}
                      </code>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                {result.error || 'Skill generation failed'}
                      {result.validation_errors && result.validation_errors.length > 0 && (
                        <ul className="mt-2 list-disc list-inside text-xs">
                          {result.validation_errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Metadata */}
                {result.metadata && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Skill Metadata</h3>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{' '}
                        <span className="font-medium">{result.metadata.name}</span>
                      </div>
                      {result.metadata.description && (
                        <div>
                          <span className="text-muted-foreground">Description:</span>{' '}
                          <span>{result.metadata.description}</span>
                        </div>
                      )}
                      {result.metadata.triggers && result.metadata.triggers.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Triggers:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {result.metadata.triggers.map((trigger, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {trigger}
                              </Badge>
                            ))}
                          </div>
                        </div>
          )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Skill Markdown Preview */}
                {result.skill_markdown && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Generated Skill Markdown
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyMarkdown}
                        className="h-7"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="bg-muted rounded-lg p-4 max-h-96 overflow-auto">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {result.skill_markdown}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating || !skillName || !description}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
           Generate Skill
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleReset}>
                Generate Another
              </Button>
              <Button onClick={handleClose}>
                {result.success ? 'Done' : 'Close'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
