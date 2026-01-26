/**
 * Toolbar Component - 工作流顶部工具栏
 *
 * 提供工作流名称输入、保存、加载、导出功能
 * - 保存: 保存为 JSON 格式到用户项目 .auto-claude/workflows/ 目录
 * - 加载: 从用户项目 .auto-claude/workflows/ 加载 JSON 工作流
 * - 导出: 导出为 .claude/commands/*.md 格式（用于 Claude Code 执行）
 */

import type React from 'react';
import { useCallback, useState, useEffect } from 'react';
import { Save, FileDown, Download, Loader2, FolderOpen } from 'lucide-react';
import { useWorkflowStore } from '@frontend/src/renderer/stores/workflow-store';
import { useCanvasStore } from '@frontend/src/renderer/stores/canvas-store';
import { Button } from '@frontend/src/renderer/components/ui/button';
import { useToast } from '@frontend/src/renderer/hooks/use-toast';
import { EditableNameField } from './EditableNameField';
import { LoadWorkflowDialog } from '../dialogs/LoadWorkflowDialog';
import { serializeWorkflow, validateWorkflow } from '../../services/workflow-service';
import { generateSlashCommandFile, nodeNameToFileName } from '../../services/export-service';

// 本地存储键
const PROJECT_PATH_KEY = 'cc-wf-studio.projectPath';

export const Toolbar: React.FC = () => {
  const {
    workflowName,
    setWorkflowName,
    activeWorkflow,
    createWorkflow,
    saveWorkflow,
    loadWorkflows,
  } = useWorkflowStore();

  // 从 canvas-store 获取节点和边
  const { nodes, edges, addNode, setNodes, setEdges } = useCanvasStore();

  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [projectPath, setProjectPath] = useState<string | null>(null);

  // 从本地存储恢复项目路径
  useEffect(() => {
    const savedPath = localStorage.getItem(PROJECT_PATH_KEY);
    if (savedPath) {
      setProjectPath(savedPath);
    }
  }, []);

  // 选择项目目录
  const handleSelectProject = useCallback(async () => {
    try {
      const result = await window.electronAPI.workflow.selectProjectDirectory();
      if (result.success && result.data) {
        setProjectPath(result.data);
        localStorage.setItem(PROJECT_PATH_KEY, result.data);
        toast({
          title: '项目已选择',
          description: `当前项目: ${result.data}`,
        });
      }
    } catch (err) {
      toast({
        title: '选择失败',
        description: '无法选择项目目录',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // 工作流名称验证模式
  const WORKFLOW_NAME_PATTERN = /^[a-z0-9_-]*$/;

  // 处理工作流名称变化
  const handleWorkflowNameChange = useCallback(
    (value: string) => {
      setWorkflowName(value);
      if (value && !WORKFLOW_NAME_PATTERN.test(value)) {
        setError('只允许小写字母、数字、连字符和下划线');
      } else {
        setError(null);
      }
    },
    [setWorkflowName]
  );

  // 保存工作流 (JSON 格式到项目目录)
  const handleSave = useCallback(async () => {
    console.log('[Toolbar] handleSave called', { workflowName, projectPath, nodes: nodes.length, edges: edges.length });

    if (!workflowName.trim()) {
      setError('工作流名称不能为空');
      console.log('[Toolbar] Save failed: workflow name is empty');
      return;
    }

    if (!WORKFLOW_NAME_PATTERN.test(workflowName)) {
      setError('工作流名称格式无效');
      console.log('[Toolbar] Save failed: invalid workflow name format');
      return;
    }

    if (!projectPath) {
      toast({
        title: '请先选择项目',
        description: '点击"选择项目"按钮选择一个项目目录',
        variant: 'destructive',
      });
      console.log('[Toolbar] Save failed: no project path');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 序列化当前画布状态
      console.log('[Toolbar] Serializing workflow...');
      const workflow = serializeWorkflow(
        nodes as any,
        edges as any,
        workflowName
      );
      console.log('[Toolbar] Serialized workflow:', workflow);

      // 验证工作流
      const validation = validateWorkflow(workflow);
      console.log('[Toolbar] Validation result:', validation);
      if (!validation.valid) {
        setError(validation.errors.join('; '));
        toast({
          title: '验证失败',
          description: validation.errors.join('; '),
          variant: 'destructive',
        });
        return;
      }

      // 保存到项目目录
      console.log('[Toolbar] Saving to project:', projectPath);
      const result = await window.electronAPI.workflow.saveWorkflowToProject(workflow, projectPath);
      console.log('[Toolbar] Save result:', result);

      if (result.success) {
        toast({
          title: '保存成功',
          description: `已保存到 ${projectPath}/.auto-claude/workflows/${workflowName}.json`,
        });
      } else {
        throw new Error(result.error || '保存失败');
      }
    } catch (err) {
      console.error('[Toolbar] Save error:', err);
      const errorMessage = err instanceof Error ? err.message : '保存失败';
      setError(errorMessage);
      toast({
        title: '保存失败',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [workflowName, nodes, edges, projectPath, toast]);

  // 加载工作流 - 打开对话框
  const handleLoadClick = useCallback(() => {
    console.log('[Toolbar] handleLoadClick called', { projectPath });
    if (!projectPath) {
      toast({
        title: '请先选择项目',
        description: '点击"选择项目"按钮选择一个项目目录',
        variant: 'destructive',
      });
      return;
    }
    console.log('[Toolbar] Opening load dialog');
    setShowLoadDialog(true);
  }, [projectPath, toast]);

  // 加载工作流 - 从对话框加载
  const handleLoadFromDialog = useCallback(() => {
    setShowLoadDialog(false);
  }, []);

  // 导出工作流 (Markdown 格式到项目 .claude/commands/)
  const handleExport = useCallback(async () => {
    if (!workflowName.trim()) {
      setError('工作流名称不能为空');
      return;
    }

    if (!projectPath) {
      toast({
        title: '请先选择项目',
        description: '点击"选择项目"按钮选择一个项目目录',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      // 序列化当前画布状态
      const workflow = serializeWorkflow(
        nodes as any,
        edges as any,
        workflowName
      );

      // 验证工作流
      const validation = validateWorkflow(workflow);
      if (!validation.valid) {
        setError(validation.errors.join('; '));
        toast({
          title: '验证失败',
          description: validation.errors.join('; '),
          variant: 'destructive',
        });
        return;
      }

      // 生成 Markdown 内容
      const mdContent = generateSlashCommandFile(workflow);
      const fileName = nodeNameToFileName(workflowName);

      // 导出到项目目录
      const result = await window.electronAPI.workflow.exportWorkflowToProject(workflow, mdContent, projectPath);

      if (result.success) {
        toast({
          title: '导出成功',
          description: `已导出到 ${projectPath}/.claude/commands/${fileName}.md`,
        });
      } else {
        throw new Error(result.error || '导出失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导出失败';
      setError(errorMessage);
      toast({
        title: '导出失败',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [workflowName, nodes, edges, projectPath, toast]);

  // 获取项目名称（用于显示）
  const projectName = projectPath ? projectPath.split('/').pop() : null;

  return (
    <div className="flex items-center gap-4 p-4 border-b bg-background">
      {/* 左侧：项目选择和工作流名称 */}
      <div className="flex items-center gap-2 flex-1">
        {/* 选择项目按钮 */}
        <Button
          onClick={handleSelectProject}
          variant="ghost"
          size="sm"
          className="gap-2 shrink-0"
          title={projectPath || '选择项目目录'}
        >
          <FolderOpen className="h-4 w-4" />
          {projectName || '选择项目'}
        </Button>

        {/* 工作流名称输入 */}
        <div className="flex-1">
          <EditableNameField
            value={workflowName}
            onChange={handleWorkflowNameChange}
            placeholder="workflow-name"
            error={error}
          />
        </div>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 保存按钮 (JSON) */}
        <Button
          onClick={handleSave}
          disabled={isSaving || !projectPath}
          variant="default"
          size="sm"
          className="gap-2"
          title={projectPath ? `保存到 ${projectPath}/.auto-claude/workflows/` : '请先选择项目'}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              保存
            </>
          )}
        </Button>

        {/* 加载按钮 */}
        <Button
          onClick={handleLoadClick}
          disabled={isLoading || !projectPath}
          variant="secondary"
          size="sm"
          className="gap-2"
          title={projectPath ? `从 ${projectPath}/.auto-claude/workflows/ 加载` : '请先选择项目'}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中...
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              加载
            </>
          )}
        </Button>

        {/* 导出按钮 (Markdown) */}
        <Button
          onClick={handleExport}
          disabled={isExporting || !projectPath}
          variant="outline"
          size="sm"
          className="gap-2"
          title={projectPath ? `导出到 ${projectPath}/.claude/commands/` : '请先选择项目'}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              导出中...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              导出 MD
            </>
          )}
        </Button>
      </div>

      {/* 加载工作流对话框 */}
      <LoadWorkflowDialog
        open={showLoadDialog}
        onOpenChange={setShowLoadDialog}
        onLoad={handleLoadFromDialog}
        projectPath={projectPath}
      />
    </div>
  );
};
