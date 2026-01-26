/**
 * Description Panel Component
 * ===========================
 *
 * Collapsible panel for editing workflow description.
 * Simplified version without AI generation and editor integration.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { NotepadText, Minus, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DescriptionPanelProps {
  description: string;
  onDescriptionChange: (description: string) => void;
  className?: string;
}

export const DescriptionPanel: React.FC<DescriptionPanelProps> = ({
  description,
  onDescriptionChange,
  className,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const maxLength = 500;

  if (isCollapsed) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(false)}
        className={cn('h-8 w-8', className)}
        title="Show Description Panel"
      >
        <NotepadText className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Card className={cn('w-80', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NotepadText className="h-4 w-4" />
            <CardTitle className="text-sm">Workflow Description</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-6 w-6"
            title="Hide Description Panel"
          >
            <Minus className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe what this workflow does..."
          maxLength={maxLength}
          rows={6}
          className="resize-none text-sm"
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {description.length} / {maxLength}
          </span>
          {description.length > maxLength * 0.9 && (
            <Badge variant="outline" className="text-xs">
              Almost full
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
