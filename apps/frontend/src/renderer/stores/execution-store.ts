/**
 * Execution Store
 *
 * Manages workflow execution state and logs.
 * Follows Auto-Claude's Zustand store pattern with IPC integration.
 */

import { create } from 'zustand';
import type { ExecutionRecord, ExecutionLog, ExecutionConfig } from '../../shared/types';

interface ExecutionState {
  // Execution state
  executions: Map<string, ExecutionRecord>;
  activeExecutionId: string | null;
  isLoading: boolean;
  error: string | null;

  // Logs
  logs: Map<string, ExecutionLog[]>;

  // Actions - synchronous
  setExecutions: (executions: Map<string, ExecutionRecord>) => void;
  setActiveExecution: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - async with IPC
  executeWorkflow: (workflowId: string, config?: ExecutionConfig) => Promise<string>;
  pauseExecution: (executionId: string) => Promise<void>;
  resumeExecution: (executionId: string) => Promise<void>;
  stopExecution: (executionId: string) => Promise<void>;
  getExecutionStatus: (executionId: string) => Promise<ExecutionRecord>;
  getExecutionLogs: (executionId: string) => Promise<ExecutionLog[]>;

  // Actions - helpers
  addLog: (executionId: string, log: ExecutionLog) => void;
  clearLogs: (executionId: string) => void;

  // Selectors
  getActiveExecution: () => ExecutionRecord | undefined;
  getExecutionLogsSync: (executionId: string) => ExecutionLog[];
  isExecutionRunning: () => boolean;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  // Initial state
  executions: new Map(),
  activeExecutionId: null,
  isLoading: false,
  error: null,
  logs: new Map(),

  // Synchronous actions
  setExecutions: (executions) => set({ executions }),

  setActiveExecution: (id) => set({ activeExecutionId: id }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  // Async actions with IPC
  executeWorkflow: async (workflowId, config = {}) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.workflow.executeWorkflow(workflowId as any, config);

      if (result.success && result.data) {
        const executionId = result.data;

        // Listen to execution events
        const unsubscribe = window.electronAPI.workflow.onWorkflowExecutionProgress((data) => {
          if (data.executionId === executionId) {
            set((state) => {
              const executions = new Map(state.executions);
              const existing = executions.get(executionId);
              if (existing) {
                executions.set(executionId, {
                  ...existing,
                  status: data.status as ExecutionRecord['status'],
                  currentNodeId: data.currentNodeId,
                });
              }
              return { executions };
            });
          }
        });

        const unsubscribeComplete = window.electronAPI.workflow.onWorkflowExecutionComplete((data) => {
          if (data.executionId === executionId) {
            set((state) => {
              const executions = new Map(state.executions);
              const existing = executions.get(executionId);
              if (existing) {
                executions.set(executionId, {
                  ...existing,
                  status: data.status as ExecutionRecord['status'],
                  completedAt: new Date().toISOString(),
                });
              }
              return { executions, isLoading: false };
            });
            unsubscribe();
            unsubscribeComplete();
          }
        });

        set({ activeExecutionId: executionId, isLoading: false });
        return executionId;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute workflow';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  pauseExecution: async (executionId) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.workflow.pauseExecution(executionId);

      if (result.success) {
        set((state) => {
          const executions = new Map(state.executions);
          const existing = executions.get(executionId);
          if (existing) {
            executions.set(executionId, { ...existing, status: 'paused' });
          }
          return { executions, isLoading: false };
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pause execution';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  resumeExecution: async (executionId) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.workflow.resumeExecution(executionId);

      if (result.success) {
        set((state) => {
          const executions = new Map(state.executions);
          const existing = executions.get(executionId);
          if (existing) {
            executions.set(executionId, { ...existing, status: 'running' });
          }
          return { executions, isLoading: false };
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resume execution';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  stopExecution: async (executionId) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.workflow.stopExecution(executionId);

      if (result.success) {
        set((state) => {
          const executions = new Map(state.executions);
          const existing = executions.get(executionId);
          if (existing) {
            executions.set(executionId, {
              ...existing,
              status: 'cancelled',
              completedAt: new Date().toISOString(),
            });
          }
          return { executions, isLoading: false };
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop execution';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  getExecutionStatus: async (executionId) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.workflow.getExecutionStatus(executionId);

      if (result.success && result.data) {
        set((state) => {
          const executions = new Map(state.executions);
          executions.set(executionId, result.data!);
          return { executions, isLoading: false };
        });
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get execution status';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  getExecutionLogs: async (executionId) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.workflow.getExecutionLogs(executionId);

      if (result.success && result.data) {
        set((state) => {
          const logs = new Map(state.logs);
          logs.set(executionId, result.data!);
          return { logs, isLoading: false };
        });
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get execution logs';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Helper actions
  addLog: (executionId, log) =>
    set((state) => {
      const logs = new Map(state.logs);
      const executionLogs = logs.get(executionId) || [];
      logs.set(executionId, [...executionLogs, log]);
      return { logs };
    }),

  clearLogs: (executionId) =>
    set((state) => {
      const logs = new Map(state.logs);
      logs.delete(executionId);
      return { logs };
    }),

  // Selectors
  getActiveExecution: () => {
    const state = get();
    if (!state.activeExecutionId) return undefined;
    return state.executions.get(state.activeExecutionId);
  },

  getExecutionLogsSync: (executionId) => {
    const state = get();
    return state.logs.get(executionId) || [];
  },

  isExecutionRunning: () => {
    const state = get();
    if (!state.activeExecutionId) return false;
    const execution = state.executions.get(state.activeExecutionId);
    return execution?.status === 'running' || execution?.status === 'pending';
  },
}));
