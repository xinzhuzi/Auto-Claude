/**
 * Novel Workflow Store
 *
 * 管理小说专用工作流系统（向导式表单 + 预定义步骤模板）
 * 与 Auto-Claude 现有工作流系统并存，各有定位
 */

import { create } from 'zustand';
import type {
  NovelWorkflow,
  WorkflowExecution,
  WorkflowCategory,
  StepResult
} from '../../shared/types/novel';
import { NOVEL_WORKFLOW_TEMPLATES } from '../data/novel-workflow-templates';

interface NovelWorkflowState {
  // 工作流列表
  workflows: NovelWorkflow[];
  myWorkflows: NovelWorkflow[];
  favorites: string[];

  // 当前执行
  activeExecution: WorkflowExecution | null;
  executionHistory: WorkflowExecution[];

  // UI 状态
  searchQuery: string;
  categoryFilter: WorkflowCategory | 'all';
  isLoading: boolean;
  error: string | null;

  // Actions - 工作流管理
  loadWorkflows: () => Promise<void>;
  createWorkflow: (workflow: Omit<NovelWorkflow, 'id' | 'createdAt' | 'updatedAt'>) => Promise<NovelWorkflow>;
  updateWorkflow: (id: string, updates: Partial<NovelWorkflow>) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  duplicateWorkflow: (id: string) => Promise<NovelWorkflow>;
  toggleFavorite: (id: string) => void;

  // Actions - 执行
  startExecution: (workflowId: string, projectId: string, params: Record<string, unknown>, mode: 'step' | 'auto') => void;
  executeNextStep: () => Promise<void>;
  cancelExecution: () => void;
  updateExecutionProgress: (stepIndex: number, result: StepResult) => void;
  completeExecution: () => void;
  failExecution: (error: string) => void;
  clearActiveExecution: () => void;

  // Actions - UI
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: WorkflowCategory | 'all') => void;
  getFilteredWorkflows: () => NovelWorkflow[];
}

export const useNovelWorkflowStore = create<NovelWorkflowState>((set, get) => ({
  // Initial state
  workflows: [],
  myWorkflows: [],
  favorites: [],
  activeExecution: null,
  executionHistory: [],
  searchQuery: '',
  categoryFilter: 'all',
  isLoading: false,
  error: null,

  // 加载工作流（包含预设模板）
  loadWorkflows: async () => {
    set({ isLoading: true, error: null });
    try {
      // 合并预设模板和用户自定义工作流
      const storedWorkflows = await loadStoredWorkflows();
      const allWorkflows = [...NOVEL_WORKFLOW_TEMPLATES, ...storedWorkflows];

      set({
        workflows: allWorkflows,
        myWorkflows: storedWorkflows,
        isLoading: false
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load workflows';
      set({ error: errorMessage, isLoading: false });
    }
  },

  // 创建新工作流
  createWorkflow: async (workflowData) => {
    set({ isLoading: true, error: null });
    try {
      const now = new Date().toISOString();
      const newWorkflow: NovelWorkflow = {
        ...workflowData,
        id: `workflow-${Date.now()}`,
        createdAt: now,
        updatedAt: now
      };

      // 保存到存储
      await saveWorkflowToStorage(newWorkflow);

      set((state) => ({
        workflows: [...state.workflows, newWorkflow],
        myWorkflows: [...state.myWorkflows, newWorkflow],
        isLoading: false
      }));

      return newWorkflow;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create workflow';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // 更新工作流
  updateWorkflow: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const existing = get().workflows.find(w => w.id === id);
      if (!existing) {
        throw new Error('Workflow not found');
      }

      const updatedWorkflow: NovelWorkflow = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await saveWorkflowToStorage(updatedWorkflow);

      set((state) => ({
        workflows: state.workflows.map(w => w.id === id ? updatedWorkflow : w),
        myWorkflows: state.myWorkflows.map(w => w.id === id ? updatedWorkflow : w),
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update workflow';
      set({ error: errorMessage, isLoading: false });
    }
  },

  // 删除工作流
  deleteWorkflow: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteWorkflowFromStorage(id);

      set((state) => ({
        workflows: state.workflows.filter(w => w.id !== id),
        myWorkflows: state.myWorkflows.filter(w => w.id !== id),
        favorites: state.favorites.filter(f => f !== id),
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete workflow';
      set({ error: errorMessage, isLoading: false });
    }
  },

  // 复制工作流
  duplicateWorkflow: async (id) => {
    const original = get().workflows.find(w => w.id === id);
    if (!original) throw new Error('Workflow not found');

    const now = new Date().toISOString();
    const duplicated: NovelWorkflow = {
      ...original,
      id: `workflow-${Date.now()}`,
      name: `${original.name} (副本)`,
      createdAt: now,
      updatedAt: now,
      usageCount: 0
    };

    await saveWorkflowToStorage(duplicated);

    set((state) => ({
      workflows: [...state.workflows, duplicated],
      myWorkflows: [...state.myWorkflows, duplicated]
    }));

    return duplicated;
  },

  // 收藏/取消收藏
  toggleFavorite: (id) => {
    set((state) => {
      const isFavorite = state.favorites.includes(id);
      return {
        favorites: isFavorite
          ? state.favorites.filter(f => f !== id)
          : [...state.favorites, id]
      };
    });
  },

  // 开始执行工作流
  startExecution: (workflowId, projectId, params, mode) => {
    const execution: WorkflowExecution = {
      id: `execution-${Date.now()}`,
      workflowId,
      projectId,
      params,
      mode,
      status: 'running',
      currentStep: 0,
      results: [],
      startedAt: new Date().toISOString()
    };

    set({ activeExecution: execution });
  },

  // 执行下一步
  executeNextStep: async () => {
    const { activeExecution, workflows } = get();

    // 检查执行状态 - 防止竞态条件
    if (!activeExecution || activeExecution.status !== 'running') return;

    const workflow = workflows.find(w => w.id === activeExecution.workflowId);
    if (!workflow) return;

    const currentStepIndex = activeExecution.currentStep || 0;
    const step = workflow.steps[currentStepIndex];

    if (!step) {
      // 所有步骤完成
      get().completeExecution();
      return;
    }

    // 更新当前步骤
    set((state) => ({
      activeExecution: state.activeExecution ? {
        ...state.activeExecution,
        currentStep: currentStepIndex
      } : null
    }));

    // 通过 IPC 调用后端执行
    try {
      // 检查 API 是否存在
      if (!window.electronAPI?.executeWorkflowStep) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.executeWorkflowStep({
        workflowId: workflow.id,
        stepId: step.id,
        promptTemplate: step.promptTemplate,
        params: activeExecution.params,
        maxTokens: step.maxTokens,
        projectId: activeExecution.projectId
      });

      // 再次检查状态 - 可能已被取消
      const currentExecution = get().activeExecution;
      if (!currentExecution || currentExecution.status !== 'running') return;

      if (result.success) {
        const stepResult: StepResult = {
          stepId: step.id,
          stepName: step.name,
          output: result.data?.data || '',
          tokensUsed: result.data?.tokensUsed,
          executedAt: new Date().toISOString()
        };

        get().updateExecutionProgress(currentStepIndex, stepResult);

        // Advance to next step for both step and auto modes
        const nextStepIndex = currentStepIndex + 1;
        const hasMoreSteps = nextStepIndex < workflow.steps.length;
        if (hasMoreSteps) {
          set((state) => ({
            activeExecution: state.activeExecution ? {
              ...state.activeExecution,
              currentStep: nextStepIndex
            } : null
          }));
        }

        // 如果是自动模式，继续执行下一步
        if (currentExecution.mode === 'auto' && hasMoreSteps) {
          await get().executeNextStep();
        } else if (!hasMoreSteps) {
          get().completeExecution();
        }
      } else {
        get().failExecution(result.error || 'Execution failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';
      get().failExecution(errorMessage);
    }
  },

  // 更新执行进度
  updateExecutionProgress: (stepIndex, result) => {
    set((state) => {
      if (!state.activeExecution) return state;

      const newResults = [...state.activeExecution.results];
      newResults[stepIndex] = result;

      return {
        activeExecution: {
          ...state.activeExecution,
          results: newResults
        }
      };
    });
  },

  // 取消执行
  cancelExecution: () => {
    set((state) => {
      if (!state.activeExecution) return state;

      const cancelledExecution: WorkflowExecution = {
        ...state.activeExecution,
        status: 'error',
        completedAt: new Date().toISOString()
      };

      return {
        activeExecution: null,
        executionHistory: [...state.executionHistory, cancelledExecution]
      };
    });
  },

  // 完成执行
  completeExecution: () => {
    set((state) => {
      if (!state.activeExecution) return state;

      const completedExecution: WorkflowExecution = {
        ...state.activeExecution,
        status: 'completed',
        completedAt: new Date().toISOString()
      };

      // 更新工作流使用次数
      const workflowId = completedExecution.workflowId;
      const updatedWorkflows = state.workflows.map(w =>
        w.id === workflowId ? { ...w, usageCount: w.usageCount + 1 } : w
      );

      return {
        activeExecution: completedExecution,
        executionHistory: [...state.executionHistory, completedExecution],
        workflows: updatedWorkflows
      };
    });
  },

  // Clear active execution after consumers have a chance to read it
  clearActiveExecution: () => {
    set({ activeExecution: null });
  },

  // 执行失败
  failExecution: (error) => {
    set((state) => {
      if (!state.activeExecution) return state;

      const failedExecution: WorkflowExecution = {
        ...state.activeExecution,
        status: 'error',
        completedAt: new Date().toISOString()
      };

      return {
        activeExecution: failedExecution,
        executionHistory: [...state.executionHistory, failedExecution],
        error
      };
    });
  },

  // UI Actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),

  // 获取过滤后的工作流
  getFilteredWorkflows: () => {
    const { workflows, searchQuery, categoryFilter, favorites } = get();

    let filtered = workflows;

    // 分类过滤
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(w => w.category === categoryFilter);
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(w =>
        w.name.toLowerCase().includes(query) ||
        w.description.toLowerCase().includes(query) ||
        w.author.toLowerCase().includes(query)
      );
    }

    // 排序：收藏优先，然后按使用次数
    return filtered.sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 1 : 0;
      const bFav = favorites.includes(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return b.usageCount - a.usageCount;
    });
  }
}));

// ===== 辅助函数 =====

async function loadStoredWorkflows(): Promise<NovelWorkflow[]> {
  try {
    if (!window.electronAPI?.getNovelWorkflows) {
      throw new Error('Electron API getNovelWorkflows not available');
    }
    const result = await window.electronAPI.getNovelWorkflows();
    if (!result.success) {
      throw new Error(result.error || 'Failed to load workflows');
    }
    return result.data || [];
  } catch (error) {
    console.error('[NovelWorkflowStore] Failed to load workflows:', error);
    throw error;
  }
}

async function saveWorkflowToStorage(workflow: NovelWorkflow): Promise<void> {
  if (!window.electronAPI?.saveNovelWorkflow) {
    throw new Error('Electron API saveNovelWorkflow not available');
  }
  const result = await window.electronAPI.saveNovelWorkflow(workflow);
  if (!result.success) {
    throw new Error(result.error || 'Failed to save workflow');
  }
}

async function deleteWorkflowFromStorage(id: string): Promise<void> {
  if (!window.electronAPI?.deleteNovelWorkflow) {
    throw new Error('Electron API deleteNovelWorkflow not available');
  }
  const result = await window.electronAPI.deleteNovelWorkflow(id);
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete workflow');
  }
}
