/**
 * TaskOptimizeHelper - AI 任务描述优化组件
 *
 * 提供"优化任务描述"按钮和 worktree 推荐提示功能。
 * 这是一个独立的 helper 组件，需要手动集成到 TaskCreationWizard 中。
 *
 * 使用方式:
 *   1. 导入组件和 hook
 *   2. 在 TaskCreationWizard 中使用 useTaskOptimize hook
 *   3. 渲染 OptimizeButton 和 WorktreeRecommendation 组件
 *
 * 示例:
 *   const {
 *     isOptimizing,
 *     worktreeRecommendation,
 *     handleOptimize,
 *   } = useTaskOptimize({
 *     description,
 *     projectPath,
 *     referencedFiles,
 *     onDescriptionChange: setDescription,
 *     onWorktreeChange: setUseWorktree,
 *     onShowGitOptions: () => setShowGitOptions(true),
 *   });
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import type {
  WorktreeRecommendation,
  OptimizeTaskResponse
} from '../../shared/types/task-optimize';

// Re-export types for convenience
export type { WorktreeRecommendation, OptimizeTaskResponse };

export interface UseTaskOptimizeOptions {
  description: string;
  projectPath: string | null;
  referencedFiles: Array<{ path: string }>;
  onDescriptionChange: (description: string) => void;
  onWorktreeChange: (useWorktree: boolean) => void;
  onShowGitOptions?: () => void;
}

export interface UseTaskOptimizeReturn {
  isOptimizing: boolean;
  worktreeRecommendation: WorktreeRecommendation | null;
  optimizeError: string | null;
  handleOptimize: () => Promise<void>;
  clearRecommendation: () => void;
  clearError: () => void;
}

// ============================================================
// Hook: useTaskOptimize
// ============================================================

export function useTaskOptimize({
  description,
  projectPath,
  referencedFiles,
  onDescriptionChange,
  onWorktreeChange,
  onShowGitOptions,
}: UseTaskOptimizeOptions): UseTaskOptimizeReturn {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [worktreeRecommendation, setWorktreeRecommendation] =
    useState<WorktreeRecommendation | null>(null);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  const handleOptimize = useCallback(async () => {
    if (!description.trim()) {
      setOptimizeError('请先输入任务描述');
      return;
    }
    if (!projectPath) {
      setOptimizeError('项目路径未找到，请确保已选择项目');
      return;
    }

    setIsOptimizing(true);
    setOptimizeError(null);
    try {
      // 调用后端 API
      const response = await window.electronAPI.optimizeTaskDescription({
        task_description: description,
        project_path: projectPath,
        target_paths: referencedFiles.map((f) => f.path),
      });

      if (response.success && response.data) {
        // 更新描述
        onDescriptionChange(response.data.optimized_description);

        // 显示 worktree 推荐
        setWorktreeRecommendation(response.data.worktree_recommendation);

        // 如果 AI 推荐使用 worktree，自动勾选并展开 Git Options
        if (response.data.worktree_recommendation.use_worktree) {
          onWorktreeChange(true);
          onShowGitOptions?.();
        }
      } else if (response.error) {
        setOptimizeError(response.error);
        console.error('Failed to optimize description:', response.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setOptimizeError(errorMessage);
      console.error('Failed to optimize description:', err);
    } finally {
      setIsOptimizing(false);
    }
  }, [
    description,
    projectPath,
    referencedFiles,
    onDescriptionChange,
    onWorktreeChange,
    onShowGitOptions,
  ]);

  const clearRecommendation = useCallback(() => {
    setWorktreeRecommendation(null);
  }, []);

  const clearError = useCallback(() => {
    setOptimizeError(null);
  }, []);

  return {
    isOptimizing,
    worktreeRecommendation,
    optimizeError,
    handleOptimize,
    clearRecommendation,
    clearError,
  };
}

// ============================================================
// 组件: OptimizeButton
// ============================================================

interface OptimizeButtonProps {
  isOptimizing: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

export function OptimizeButton({
  isOptimizing,
  disabled,
  onClick,
  className,
}: OptimizeButtonProps) {
  const { t } = useTranslation('tasks');

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled || isOptimizing}
      className={cn('gap-1.5 h-7 text-xs', className)}
    >
      {isOptimizing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{t('wizard.optimizing')}</span>
        </>
      ) : (
        <>
          <Sparkles className="h-3 w-3" />
          <span>{t('wizard.optimizeDescription')}</span>
        </>
      )}
    </Button>
  );
}

// ============================================================
// 组件: WorktreeRecommendationBanner
// ============================================================

interface WorktreeRecommendationBannerProps {
  recommendation: WorktreeRecommendation;
  className?: string;
}

export function WorktreeRecommendationBanner({
  recommendation,
  className,
}: WorktreeRecommendationBannerProps) {
  const { t } = useTranslation('tasks');

  return (
    <div
      className={cn(
        'flex items-start gap-2 p-3 rounded-md text-sm',
        recommendation.use_worktree
          ? 'bg-warning/10 text-warning border border-warning/20'
          : 'bg-muted text-muted-foreground',
        className
      )}
    >
      <span className="mt-0.5">
        {recommendation.use_worktree ? '⚠️' : '💡'}
      </span>
      <div>
        <p className="font-medium">
          {recommendation.use_worktree
            ? t('wizard.worktreeRecommended')
            : t('wizard.directModeRecommended')}
        </p>
        <p className="text-xs mt-1 opacity-80">{recommendation.reason}</p>
      </div>
    </div>
  );
}

// ============================================================
// 组件: DescriptionLabelWithOptimize
// ============================================================

interface DescriptionLabelWithOptimizeProps {
  isOptimizing: boolean;
  disabled?: boolean;
  onOptimize: () => void;
  label?: string;
  required?: boolean;
}

/**
 * 描述标签行组件，包含标签和优化按钮
 *
 * 布局: [描述 *] -------------------- [AI 优化描述]
 */
export function DescriptionLabelWithOptimize({
  isOptimizing,
  disabled,
  onOptimize,
  label,
  required = true,
}: DescriptionLabelWithOptimizeProps) {
  const { t } = useTranslation('tasks');
  const displayLabel = label || t('form.description');

  return (
    <div className="flex items-center justify-between">
      <label
        htmlFor="description"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {displayLabel} {required && <span className="text-destructive">*</span>}
      </label>
      <OptimizeButton
        isOptimizing={isOptimizing}
        disabled={disabled}
        onClick={onOptimize}
      />
    </div>
  );
}

// ============================================================
// 默认导出
// ============================================================

export default {
  useTaskOptimize,
  OptimizeButton,
  WorktreeRecommendationBanner,
  DescriptionLabelWithOptimize,
};
