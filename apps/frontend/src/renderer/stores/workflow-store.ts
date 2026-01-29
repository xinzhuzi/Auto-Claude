/**
 * Workflow Store
 *
 * Manages workflow CRUD operations and active workflow state.
 * Follows Auto-Claude's Zustand store pattern with IPC integration.
 *
 * Compatible with cc-wf-studio components.
 */

import { create } from 'zustand';
import type { Workflow, ExecutionConfig, ExecutionRecord, WorkflowNode } from '../../shared/types';

interface WorkflowState {
  // Core state
  workflows: Workflow[];
  activeWorkflowId: string | null;
  activeWorkflow: Workflow | null;  // cc-wf-studio 兼容
  workflowName: string;  // cc-wf-studio 兼容
  workflowDescription: string;  // cc-wf-studio 兼容
  isLoading: boolean;
  error: string | null;

  // UI state
  searchQuery: string;
  selectedWorkflows: Set<string>;
  selectedNodeId: string | null;

  // Actions - synchronous
  setWorkflows: (workflows: Workflow[]) => void;
  setActiveWorkflow: (idOrWorkflow: string | Workflow | null) => void;
  setWorkflowName: (name: string) => void;  // cc-wf-studio 兼容
  setWorkflowDescription: (description: string) => void;  // cc-wf-studio 兼容
  updateWorkflow: (workflow: Workflow) => void;  // cc-wf-studio 兼容
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedWorkflows: (ids: Set<string>) => void;
  toggleWorkflowSelection: (id: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNode['data']>) => void;

  // Actions - async with IPC
  createWorkflow: (name: string, description?: string) => Promise<Workflow>;
  saveWorkflow: (workflow: Workflow) => Promise<void>;
  loadWorkflows: () => Promise<void>;
  duplicateWorkflow: (id: string) => Promise<Workflow>;
  deleteWorkflow: (id: string) => Promise<void>;

  // Selectors (derived state)
  getActiveWorkflow: () => Workflow | undefined;
  getFilteredWorkflows: () => Workflow[];
}

// Selector hook for active workflow (derived state)
export const useActiveWorkflow = () => {
  return useWorkflowStore((state) =>
    state.workflows.find((w) => w.id === state.activeWorkflowId)
  );
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  workflows: [],
  activeWorkflowId: null,
  activeWorkflow: null,  // cc-wf-studio 兼容
  workflowName: 'my-workflow',  // cc-wf-studio 兼容
  workflowDescription: '',  // cc-wf-studio 兼容
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedWorkflows: new Set(),
  selectedNodeId: null,

  // Synchronous actions
  setWorkflows: (workflows) => set({ workflows }),

  // cc-wf-studio 兼容: 支持 id 或 Workflow 对象
  setActiveWorkflow: (idOrWorkflow) => {
    if (idOrWorkflow === null) {
      set({ activeWorkflowId: null, activeWorkflow: null });
    } else if (typeof idOrWorkflow === 'string') {
      const workflow = get().workflows.find((w) => w.id === idOrWorkflow);
      set({
        activeWorkflowId: idOrWorkflow,
        activeWorkflow: workflow || null,
        workflowName: workflow?.name || 'my-workflow',
        workflowDescription: workflow?.description || '',
      });
    } else {
      // 传入的是 Workflow 对象
      // 同时添加到 workflows 数组（如果不存在）
      const existingWorkflows = get().workflows;
      const exists = existingWorkflows.some((w) => w.id === idOrWorkflow.id);
      const updatedWorkflows = exists
        ? existingWorkflows.map((w) => w.id === idOrWorkflow.id ? idOrWorkflow : w)
        : [...existingWorkflows, idOrWorkflow];

      set({
        workflows: updatedWorkflows,
        activeWorkflowId: idOrWorkflow.id,
        activeWorkflow: idOrWorkflow,
        workflowName: idOrWorkflow.name || 'my-workflow',
        workflowDescription: idOrWorkflow.description || '',
      });
    }
  },

  // cc-wf-studio 兼容
  setWorkflowName: (name) => set({ workflowName: name }),

  // cc-wf-studio 兼容
  setWorkflowDescription: (description) => set({ workflowDescription: description }),

  // cc-wf-studio 兼容: 更新活动工作流
  updateWorkflow: (workflow) => {
    set((state) => ({
      activeWorkflow: workflow,
      activeWorkflowId: workflow.id,
      workflowName: workflow.name,
      workflowDescription: workflow.description || '',
      workflows: state.workflows.map((w) =>
        w.id === workflow.id ? workflow : w
      ),
    }));
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedWorkflows: (ids) => set({ selectedWorkflows: ids }),

  toggleWorkflowSelection: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedWorkflows);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedWorkflows: newSet };
    }),

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  updateNodeData: (nodeId, data) =>
    set((state) => {
      const activeWorkflow = state.workflows.find((w) => w.id === state.activeWorkflowId);
      if (!activeWorkflow) return state;

      const updatedNodes = activeWorkflow.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      );

      const updatedWorkflow = { ...activeWorkflow, nodes: updatedNodes };
      const updatedWorkflows = state.workflows.map((w) =>
        w.id === activeWorkflow.id ? updatedWorkflow : w
      );

      return {
        workflows: updatedWorkflows,
        activeWorkflow: updatedWorkflow,  // Also update activeWorkflow for cc-wf-studio compatibility
      };
    }),

  // Async actions with IPC
  createWorkflow: async (name, description) => {
    set({ isLoading: true, error: null });

    try {
      // Create initial Start and End nodes (matching cc-wf-studio behavior)
      const workflowData: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        description: description || '',
        version: '1.0.0',
        schemaVersion: '1.2.0',
        nodes: [
          {
            id: 'start-node-default',
            name: 'Start',
            type: 'start' as any,
            position: { x: 100, y: 200 },
            data: { label: 'Start' },
          },
          {
            id: 'end-node-default',
            name: 'End',
            type: 'end' as any,
            position: { x: 600, y: 200 },
            data: { label: 'End' },
          },
        ],
        connections: [],
        metadata: {},
      };

      const result = await window.electronAPI.workflow.createWorkflow(workflowData);

      if (result.success && result.data) {
        set((state) => ({
          workflows: [...state.workflows, result.data!],
          activeWorkflowId: result.data!.id,
          isLoading: false,
        }));
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create workflow';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  saveWorkflow: async (workflow) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.workflow.saveWorkflow(workflow);

      if (result.success) {
        // Optimistic update - also update activeWorkflow for immediate UI sync
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === workflow.id ? workflow : w
          ),
          activeWorkflow: state.activeWorkflowId === workflow.id ? workflow : state.activeWorkflow,
          isLoading: false,
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save workflow';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  loadWorkflows: async () => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.workflow.listWorkflows();

      if (result.success && result.data) {
        set({
          workflows: result.data,
          isLoading: false
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load workflows';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  duplicateWorkflow: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.workflow.duplicateWorkflow(id);

      if (result.success && result.data) {
        set((state) => ({
          workflows: [...state.workflows, result.data!],
          activeWorkflowId: result.data!.id,
          isLoading: false,
        }));
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to duplicate workflow';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  deleteWorkflow: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.workflow.deleteWorkflow(id);

      if (result.success) {
        set((state) => ({
          workflows: state.workflows.filter((w) => w.id !== id),
          activeWorkflowId: state.activeWorkflowId === id ? null : state.activeWorkflowId,
          isLoading: false,
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete workflow';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Selectors
  getActiveWorkflow: () => {
    const state = get();
    return state.workflows.find((w) => w.id === state.activeWorkflowId);
  },

  getFilteredWorkflows: () => {
    const state = get();
    if (!state.searchQuery) {
      return state.workflows;
    }
    const query = state.searchQuery.toLowerCase();
    return state.workflows.filter((w) =>
      w.name.toLowerCase().includes(query) ||
      (w.description && w.description.toLowerCase().includes(query))
    );
  },
}));
