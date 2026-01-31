/**
 * WorkflowStudioView Component
 *
 * Main view for the visual workflow editor
 * Combines Canvas, NodePalette, PropertyPanel, and ExecutionPanel
 * Part of cc-wf-studio integration into Auto-Claude
 *
 * Save/Load/Export Logic:
 * - Save: 保存到 {project}/.auto-claude/workflows/{name}.json
 * - Load: 从 {project}/.auto-claude/workflows/ 加载
 * - Export: 导出到 {project}/.claude/commands/{name}.md
 *
 * Uses Auto-Claude's existing project system (useProjectStore) for project path
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PropertyPanel, ExecutionPanel, Toolbar } from './workflow';
import WorkflowCanvasWithProvider from './workflow/WorkflowCanvas';
import type { Workflow } from '../../shared/types';
import { useWorkflowStore, useActiveWorkflow } from '../stores/workflow-store';
import { Button } from './ui/button';
import { Plus, FileText, Loader2, GripHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../hooks/use-toast';
import { createLogger } from '../lib/logger';
import { LoadWorkflowDialog } from './workflow/dialogs/LoadWorkflowDialog';
import { useProjectStore } from '../stores/project-store';

// Logger for this component
const log = createLogger('WorkflowStudioView');

interface WorkflowStudioViewProps {
  projectId?: string;
  className?: string;
}

/**
 * WorkflowStudioView Component
 *
 * Layout:
 * - Left: NodePalette (draggable node types)
 * - Center: WorkflowCanvas (main editing area)
 * - Right: PropertyPanel (node properties)
 * - Bottom: ExecutionPanel (execution status)
 */
export const WorkflowStudioView: React.FC<WorkflowStudioViewProps> = ({
  className,
}) => {
  const { t } = useTranslation('workflowStudio');
  const { toast } = useToast();

  // Get selected project from Auto-Claude's project store
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const projects = useProjectStore((state) => state.projects);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const projectPath = selectedProject?.path || null;

  const [showLoadDialog, setShowLoadDialog] = useState(false);

  // Use selector pattern to avoid potential undefined issues
  const createWorkflow = useWorkflowStore((state) => state.createWorkflow);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const setActiveWorkflow = useWorkflowStore((state) => state.setActiveWorkflow);
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const isLoading = useWorkflowStore((state) => state.isLoading);
  const error = useWorkflowStore((state) => state.error);
  const isPropertyPanelOpen = useWorkflowStore((state) => state.isPropertyPanelOpen);
  const isExecutionPanelOpen = useWorkflowStore((state) => state.isExecutionPanelOpen);
  const setPropertyPanelOpen = useWorkflowStore((state) => state.setPropertyPanelOpen);
  const setExecutionPanelOpen = useWorkflowStore((state) => state.setExecutionPanelOpen);
  const activeWorkflow = useActiveWorkflow();

  // Execution panel resizable height
  const [executionPanelHeight, setExecutionPanelHeight] = useState(320); // Default h-80 = 320px
  const isResizingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle resize drag
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    const startY = e.clientY;
    const startHeight = executionPanelHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.min(Math.max(startHeight + deltaY, 150), 600); // Min 150px, Max 600px
      setExecutionPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [executionPanelHeight]);

  // Load existing workflows from project on mount
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [projectWorkflows, setProjectWorkflows] = useState<Workflow[]>([]);
  useEffect(() => {
    const loadExistingWorkflows = async () => {
      if (projectPath) {
        setIsLoadingList(true);
        try {
          // Use project-specific API instead of global loadWorkflows
          const result = await window.electronAPI.workflow.listWorkflowsFromProject(projectPath);
          if (result.success && result.data) {
            setProjectWorkflows(result.data);
          }
        } catch (err) {
          log.error('Failed to load workflows from project', err);
        } finally {
          setIsLoadingList(false);
        }
      }
    };
    loadExistingWorkflows();
  }, [projectPath]);


  /**
   * Handle create new workflow
   */
  const handleCreateWorkflow = async () => {
    log.info('Creating workflow...');
    try {
      const workflow = await createWorkflow('new-workflow', 'My workflow');
      log.info('Workflow created', { id: workflow?.id, name: workflow?.name });
    } catch (err) {
      log.error('Failed to create workflow', err);
    }
  };

  /**
   * Handle save workflow - Save to project .auto-claude/workflows/
   */
  const handleSave = useCallback(async () => {
    // Use nodes and connections from activeWorkflow (the actual canvas data)
    const nodes = activeWorkflow?.nodes || [];
    const connections = activeWorkflow?.connections || [];

    log.info('handleSave called', { workflowName, projectPath, nodesCount: nodes.length, connectionsCount: connections.length });

    if (!workflowName || !workflowName.trim()) {
      log.warn('Save failed: workflow name is empty');
      toast({
        title: '保存失败',
        description: '工作流名称不能为空',
        variant: 'destructive',
      });
      return;
    }

    if (!projectPath) {
      log.warn('Save failed: no project selected');
      toast({
        title: '请先选择项目',
        description: '在左侧边栏选择一个项目',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Import serialization functions dynamically
      const { serializeWorkflow, validateWorkflow } = await import('../services/workflow');

      // Convert workflow nodes to ReactFlow format for serialization
      const reactFlowNodes = nodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data || {},
      }));

      const reactFlowEdges = connections.map((conn: any) => ({
        id: conn.id,
        source: conn.from,
        target: conn.to,
        sourceHandle: conn.fromPort,
        targetHandle: conn.toPort,
      }));

      // Serialize current canvas state
      log.info('Serializing workflow...', { nodesCount: reactFlowNodes.length, edgesCount: reactFlowEdges.length });
      const workflow = serializeWorkflow(reactFlowNodes, reactFlowEdges, workflowName);
      log.info('Serialized workflow', { name: workflow.name, nodesCount: workflow.nodes.length });

      // Validate workflow
      const validation = validateWorkflow(workflow);
      log.info('Validation result', validation);
      if (!validation.valid) {
        log.warn('Validation failed', { errors: validation.errors });
        toast({
          title: '验证失败',
          description: validation.errors.join('; '),
          variant: 'destructive',
        });
        return;
      }

      // Save to project directory
      log.info('Saving to project', { projectPath });
      const result = await window.electronAPI.workflow.saveWorkflowToProject(workflow, projectPath);
      log.info('Save result', result);

      if (result.success) {
        toast({
          title: '保存成功',
          description: `已保存到 ${projectPath}/.auto-claude/workflows/${workflowName}.json`,
        });
      } else {
        throw new Error(result.error || '保存失败');
      }
    } catch (err) {
      log.error('Save error', err);
      toast({
        title: '保存失败',
        description: err instanceof Error ? err.message : '保存失败',
        variant: 'destructive',
      });
    }
  }, [workflowName, activeWorkflow, projectPath, toast]);

  /**
   * Handle load workflow - Open load dialog
   */
  const handleLoad = useCallback(async () => {
    log.info('handleLoad called', { projectPath });

    if (!projectPath) {
      log.warn('Load failed: no project selected');
      toast({
        title: '请先选择项目',
        description: '在左侧边栏选择一个项目',
        variant: 'destructive',
      });
      return;
    }

    log.info('Opening load dialog');
    setShowLoadDialog(true);
  }, [projectPath, toast]);

  /**
   * Handle load from dialog callback
   */
  const handleLoadFromDialog = useCallback(() => {
    log.info('Workflow loaded from dialog');
    setShowLoadDialog(false);
  }, []);

  /**
   * Handle export workflow - Export to project .claude/commands/
   */
  const handleExport = useCallback(async () => {
    // Use nodes and connections from activeWorkflow (the actual canvas data)
    const nodes = activeWorkflow?.nodes || [];
    const connections = activeWorkflow?.connections || [];

    log.info('handleExport called', { workflowName, projectPath, nodesCount: nodes.length });

    if (!workflowName || !workflowName.trim()) {
      log.warn('Export failed: workflow name is empty');
      toast({
        title: '导出失败',
        description: '工作流名称不能为空',
        variant: 'destructive',
      });
      return;
    }

    if (!projectPath) {
      log.warn('Export failed: no project selected');
      toast({
        title: '请先选择项目',
        description: '在左侧边栏选择一个项目',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Import functions dynamically
      const { serializeWorkflow, validateWorkflow } = await import('../services/workflow');
      const { generateSlashCommandFile, nodeNameToFileName } = await import('../services/workflow');

      // Convert workflow nodes to ReactFlow format for serialization
      const reactFlowNodes = nodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data || {},
      }));

      const reactFlowEdges = connections.map((conn: any) => ({
        id: conn.id,
        source: conn.from,
        target: conn.to,
        sourceHandle: conn.fromPort,
        targetHandle: conn.toPort,
      }));

      // Serialize current canvas state
      log.info('Serializing workflow for export...');
      const workflow = serializeWorkflow(reactFlowNodes, reactFlowEdges, workflowName);

      // Validate workflow
      const validation = validateWorkflow(workflow);
      if (!validation.valid) {
        log.warn('Validation failed', { errors: validation.errors });
        toast({
          title: '验证失败',
          description: validation.errors.join('; '),
          variant: 'destructive',
        });
        return;
      }

      // Generate Markdown content
      log.info('Generating markdown content...');
      const mdContent = generateSlashCommandFile(workflow);
      const fileName = nodeNameToFileName(workflowName);

      // Export to project directory
      log.info('Exporting to project', { projectPath, fileName });
      const result = await window.electronAPI.workflow.exportWorkflowToProject(workflow, mdContent, projectPath);
      log.info('Export result', result);

      if (result.success) {
        toast({
          title: '导出成功',
          description: `已导出到 ${projectPath}/.claude/commands/${fileName}.md`,
        });
      } else {
        throw new Error(result.error || '导出失败');
      }
    } catch (err) {
      log.error('Export error', err);
      toast({
        title: '导出失败',
        description: err instanceof Error ? err.message : '导出失败',
        variant: 'destructive',
      });
    }
  }, [workflowName, activeWorkflow, projectPath, toast]);

  /**
   * Handle workflow name change
   */
  const handleWorkflowNameChange = useCallback((name: string) => {
    log.info('Workflow name changed', { name });
    setWorkflowName(name);
  }, [setWorkflowName]);

  /**
   * Handle close workflow - return to empty state
   */
  const handleCloseWorkflow = useCallback(() => {
    log.info('Closing workflow...');
    setActiveWorkflow(null);
  }, [setActiveWorkflow]);

  /**
   * Handle new workflow - clear current and create fresh one
   */
  const handleNewWorkflow = useCallback(async () => {
    log.info('Creating new workflow, clearing current...');
    try {
      const workflow = await createWorkflow('new-workflow', 'My workflow');
      log.info('New workflow created', { id: workflow?.id, name: workflow?.name });
      toast({
        title: '新工作流已创建',
        description: '画布已清空，可以开始设计新的工作流',
      });
    } catch (err) {
      log.error('Failed to create new workflow', err);
      toast({
        title: '创建失败',
        description: err instanceof Error ? err.message : '创建新工作流失败',
        variant: 'destructive',
      });
    }
  }, [createWorkflow, toast]);

  /**
   * Render empty state when no workflow is active
   */
  if (!activeWorkflow) {
    return (
    <div
      className={cn(
        'h-full w-full flex items-center justify-center bg-background',
        className
      )}
    >
      <div className="text-center space-y-6 max-w-lg">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 012-2m0 0V5a2 2 0 012 2h6a2 2 0 002 2m2-2h2.586a1 1 0 00.707.293l6.414 6.414a1 1 0 01.707.293l6.414-6.414a1 1 0 00-.707-.293l-6.414-6.414A1 1 0 0112.586 3H7"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold">
          {t('empty.title', 'No workflow selected')}
        </h2>

        {/* Description */}
        <p className="text-muted-foreground">
          {t(
            'empty.description',
            'Create a new workflow or select an existing one to start designing your automation workflow'
          )}
        </p>

        {/* Error message */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Create button */}
        <Button
          onClick={handleCreateWorkflow}
          size="lg"
          className="gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              {t('empty.creating', 'Creating...')}
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              {t('empty.createButton', 'Create New Workflow')}
            </>
          )}
        </Button>

        {/* Existing Workflows List */}
        {projectWorkflows.length > 0 && (
          <div className="rounded-lg border bg-card p-4 text-left">
            <p className="font-medium mb-3">
              {t('empty.existingWorkflows', '已有工作流')} ({projectWorkflows.length})
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {isLoadingList ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                projectWorkflows.map((workflow) => (
                  <button
                    key={workflow.id}
                    onClick={() => setActiveWorkflow(workflow)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{workflow.name}</p>
                      {workflow.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {workflow.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="rounded-lg border bg-muted/50 p-4 text-sm text-left">
          <p className="font-medium mb-2">
            {t('empty.tipsTitle', 'Quick Start:')}
          </p>
          <ul className="space-y-1 text-muted-foreground">
            <li>
              1. {t(
                'empty.tip1',
                'Create a new workflow or select from the list'
              )}
            </li>
            <li>
              2. {t(
                'empty.tip2',
                'Drag nodes from the left palette onto the canvas'
              )}
            </li>
            <li>
              3. {t(
                'empty.tip3',
                'Connect nodes by dragging from output handles to input handles'
              )}
            </li>
            <li>
              4. {t(
                'empty.tip4',
                'Configure node properties in the right panel'
              )}
            </li>
            <li>
              5. {t(
                'empty.tip5',
                'Execute your workflow and monitor progress in the bottom panel'
              )}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
  }

  /**
   * Render workflow editor when a workflow is active
   */
  return (
    <div className={cn('h-full w-full flex flex-col', className)}>
      {/* Top: Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
        {/* Inline Toolbar content - reusing Toolbar's internal structure */}
        <Toolbar
          workflowName={workflowName || activeWorkflow.name || 'Untitled Workflow'}
          onWorkflowNameChange={handleWorkflowNameChange}
          onSave={handleSave}
          onLoad={handleLoad}
          onExport={handleExport}
          onNewWorkflow={handleNewWorkflow}
          onClose={handleCloseWorkflow}
          onTogglePropertyPanel={() => setPropertyPanelOpen(!isPropertyPanelOpen)}
          onToggleExecutionPanel={() => setExecutionPanelOpen(!isExecutionPanelOpen)}
          isPropertyPanelOpen={isPropertyPanelOpen}
          isExecutionPanelOpen={isExecutionPanelOpen}
          hasUnsavedChanges={false}
          isExecuting={false}
          disabled={isLoading || !projectPath}
          className="flex-1 border-0 px-0 py-0"
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center: Canvas + Execution Panel */}
        <div className="flex-1 flex flex-col">
          {/* Main Canvas Area */}
          <div className="flex-1 flex min-h-0">
            <WorkflowCanvasWithProvider className="flex-1" />

            {/* Right: Property Panel - fixed width, scrollable, toggleable */}
            {isPropertyPanelOpen && (
              <div className="w-80 flex-shrink-0 overflow-hidden border-l">
                <PropertyPanel className="h-full" />
              </div>
            )}
          </div>

          {/* Bottom: Execution Panel - resizable, toggleable */}
          {isExecutionPanelOpen && (
            <div className="flex flex-col border-t" style={{ height: executionPanelHeight }}>
              {/* Resize Handle */}
              <div
                className="h-2 flex items-center justify-center cursor-ns-resize hover:bg-accent/50 transition-colors group"
                onMouseDown={handleResizeStart}
              >
                <GripHorizontal className="w-8 h-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
              </div>
              <ExecutionPanel className="flex-1 min-h-0" />
            </div>
          )}
        </div>
      </div>

      {/* Load Workflow Dialog */}
      <LoadWorkflowDialog
        open={showLoadDialog}
        onOpenChange={setShowLoadDialog}
        onLoad={handleLoadFromDialog}
        projectPath={projectPath}
      />
    </div>
  );
};

WorkflowStudioView.displayName = 'WorkflowStudioView';

export default WorkflowStudioView;
