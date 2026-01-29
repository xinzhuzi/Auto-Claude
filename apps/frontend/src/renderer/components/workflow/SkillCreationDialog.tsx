/**
 * Skill Creation Dialog
 * ====================
 *
 * Dialog for creating new Claude Code Skills.
 * Adapted from cc-wf-studio for Auto-Claude.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2 } from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';

export interface CreateSkillFormData {
  name: string;
  description: string;
  instructions: string;
  allowedTools?: string;
  scope: 'user' | 'project' | '';
}

interface SkillCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const SkillCreationDialog: React.FC<SkillCreationDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { t } = useTranslation('workflowStudio');
  const [formData, setFormData] = useState<CreateSkillFormData>({
    name: '',
    description: '',
    instructions: '',
    allowedTools: '',
    scope: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Get active project path
  const activeProject = useProjectStore((state) => state.getActiveProject());
  const projectPath = activeProject?.path;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        description: '',
        instructions: '',
        allowedTools: '',
        scope: '',
      });
      setErrors({});
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  }, [isSubmitting, onOpenChange]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('nameRequired');
    } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
      newErrors.name = t('creation.nameInvalidFormat');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('creation.descriptionRequired');
    }

    if (!formData.instructions.trim()) {
      newErrors.instructions = t('creation.instructionsRequired');
    }

    if (!formData.scope) {
      newErrors.scope = t('creation.scopeRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await window.electronAPI.createSkill({
        ...formData,
        projectPath: formData.scope === 'project' ? projectPath : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || t('unknown'));
      }

      onSuccess?.();
      handleClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('unknown'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, projectPath, onSuccess, handleClose, t]);

  const handleFieldChange = (field: keyof CreateSkillFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('creation.createButton')}</DialogTitle>
          <DialogDescription>
            {t('nodes.skill.description')}
          </DialogDescription>
        </DialogHeader>

        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Skill Name */}
          <div className="space-y-2">
            <Label htmlFor="skill-name">{t('creation.nameLabel')} *</Label>
            <Input
              id="skill-name"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="my-skill"
              disabled={isSubmitting}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('creation.nameHint')}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="skill-description">{t('creation.descriptionLabel')} *</Label>
            <Textarea
              id="skill-description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder={t('creation.descriptionPlaceholder')}
              disabled={isSubmitting}
              rows={3}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="skill-instructions">{t('creation.instructionsLabel')} *</Label>
            <Textarea
              id="skill-instructions"
              value={formData.instructions}
              onChange={(e) => handleFieldChange('instructions', e.target.value)}
              placeholder={t('creation.instructionsPlaceholder')}
              disabled={isSubmitting}
              rows={8}
              className={`font-mono text-sm ${errors.instructions ? 'border-destructive' : ''}`}
            />
            {errors.instructions && (
              <p className="text-xs text-destructive">{errors.instructions}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('creation.instructionsHint')}
            </p>
          </div>

          {/* Allowed Tools */}
          <div className="space-y-2">
            <Label htmlFor="skill-tools">{t('creation.allowedToolsLabel')}</Label>
            <Input
              id="skill-tools"
              value={formData.allowedTools}
              onChange={(e) => handleFieldChange('allowedTools', e.target.value)}
              placeholder="Read, Grep, Glob, Bash"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {t('creation.allowedToolsHint')}
            </p>
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label>{t('creation.scopeLabel')} *</Label>
            <RadioGroup
              value={formData.scope}
              onValueChange={(value) => handleFieldChange('scope', value)}
              disabled={isSubmitting}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="user" id="scope-user" />
                <Label htmlFor="scope-user" className="font-normal cursor-pointer">
                  {t('creation.scopeUser')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="project" id="scope-project" disabled={!projectPath} />
                <Label
                  htmlFor="scope-project"
                  className={`font-normal cursor-pointer ${!projectPath ? 'text-muted-foreground' : ''}`}
                >
                  {projectPath ? t('creation.scopeProject') : t('toolbar.selectProjectFirst')}
                </Label>
              </div>
            </RadioGroup>
            {errors.scope && (
              <p className="text-xs text-destructive">{errors.scope}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? t('creation.creatingButton') : t('creation.createButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
