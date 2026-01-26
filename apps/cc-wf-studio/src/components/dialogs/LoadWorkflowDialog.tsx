/**
 * Load Workflow Dialog - 工作流加载对话框
 *
 * 从项目目录 .auto-claude/workflows/ 加载工作流
 */

import type React from 'react';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@frontend/src/renderer/components/ui/dialog';
import { Button } from '@frontend/src/renderer/components/ui/button';
import { ScrollArea } from '@frontend/src/renderer/components/ui/scroll-area';
import { Loader2, FileText } from 'lucide-react';
import { useWorkflowStore } from '@frontend/src/renderer/stores/workflow-store';
import { useCanvasStore } from '@frontend/src/renderer/stores/canvas-store';
import { deserializeWorkflow, unwrapExportedWorkflow } from '../../services/workflow-service';
import type { Workflow } from '@frontend/src/shared/types/workflow';

interface LoadWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad?: () => void;
  projectPath: string | null;
}

export const LoadWorkflowDialog: React.FC<LoadWorkflowDialogProps> = ({
  open,
  onOpenChange,
  onLoad,
  projectPath,
}) => {
  const { setActiveWorkflow, setWorkflowName } = useWorkflowStore();
  const { setNodes, setEdges } = useCanvasStore();
  const [isLoading, setIsLoading] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 从项目目录加载工作流列表
  useEffect(() => {
    if (open && projectPath) {
      setIsLoading(true);
      setError(null);
      window.electronAPI.workflow.listWorkflowsFromProject(projectPath)
        .then((result) => {
          if (result.success && result.data) {
            setWorkflows(result.data);
          } else {
            setError(result.error || '加载工作流列表失败');
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : '加载工作流列表失败');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, projectPath]);

  const handleLoad = async (workflow: Workflow) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[LoadWorkflow] Loading workflow:', workflow.name);

      // 解包可能的导出格式
      const unwrappedWorkflow = unwrapExportedWorkflow(workflow);
      console.log('[LoadWorkflow] Unwrapped workflow:', unwrappedWorkflow);

      // 反序列化节点和边
      const { nodes, edges } = deserializeWorkflow(unwrappedWorkflow);
      console.log('[LoadWorkflow] Deserialized nodes:', nodes);
      console.log('[LoadWorkflow] Deserialized edges:', edges);

      // 设置为活动工作流
      setActiveWorkflow(unwrappedWorkflow);

      // 设置工作流名称
      setWorkflowName(unwrappedWorkflow.name);

      // 更新画布
      setNodes(nodes as any);
      setEdges(edges as any);

      // 关闭对话框
      onOpenChange(false);

      // 触发回调
      onLoad?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载失败';
      setError(errorMessage);
      console.error('Failed to load workflow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>加载工作流</DialogTitle>
          <DialogDescription>
            {projectPath
              ? `从 ${projectPath}/.auto-claude/workflows/ 加载`
              : '请先选择项目目录'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg mb-4">
            <p className="text-sm font-medium">加载失败</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        )}

        {!projectPath ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              请先选择项目目录
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2">加载中...</span>
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              没有可用的工作流
            </p>
            <p className="text-xs text-muted-foreground">
              保存一个工作流后再试
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 p-4">
              {workflows.map((workflow) => (
                <button
                  key={workflow.id || workflow.name}
                  onClick={() => handleLoad(workflow)}
                  disabled={isLoading}
                  className={`
                    w-full text-left p-4 rounded-lg border-2
                    hover:bg-accent
                    disabled:opacity-50
                    transition-colors
                    border-border
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="font-medium">{workflow.name}</div>
                      {workflow.description && (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {workflow.description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        更新于{' '}
                        {new Date(workflow.updatedAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
