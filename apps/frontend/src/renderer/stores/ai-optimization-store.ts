/**
 * AI Optimization Store
 * =====================
 *
 * Manages AI optimization conversation state and history.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface OptimizationSession {
  workflowId: string;
  messages: Message[];
  lastUpdated: number;
}

export interface AIOptimizationStore {
  // State
  sessions: Record<string, OptimizationSession>;
  currentWorkflowId: string | null;

  // Actions
  startSession: (workflowId: string) => void;
  addMessage: (workflowId: string, message: Message) => void;
  clearSession: (workflowId: string) => void;
  clearAllSessions: () => void;
  getSession: (workflowId: string) => OptimizationSession | undefined;
  setCurrentWorkflow: (workflowId: string | null) => void;
}

export const useAIOptimizationStore = create<AIOptimizationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      sessions: {},
      currentWorkflowId: null,

      // Start a new optimization session
      startSession: (workflowId) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [workflowId]: {
              workflowId,
              messages: [],
              lastUpdated: Date.now(),
            },
          },
          currentWorkflowId: workflowId,
        }));
      },

      // Add a message to the conversation
      addMessage: (workflowId, message) => {
        set((state) => {
          const session = state.sessions[workflowId];

          if (!session) {
            // Create session if it doesn't exist
            return {
              sessions: {
                ...state.sessions,
                [workflowId]: {
                  workflowId,
                  messages: [message],
                  lastUpdated: Date.now(),
                },
              },
            };
          }

          return {
            sessions: {
              ...state.sessions,
              [workflowId]: {
                ...session,
                messages: [...session.messages, message],
                lastUpdated: Date.now(),
              },
            },
          };
        });
      },

      // Clear a specific session
      clearSession: (workflowId) => {
        set((state) => {
          const { [workflowId]: removed, ...remainingSessions } = state.sessions;

          return {
            sessions: remainingSessions,
            currentWorkflowId:
              state.currentWorkflowId === workflowId ? null : state.currentWorkflowId,
          };
        });
      },

      // Clear all sessions
      clearAllSessions: () => {
        set({
          sessions: {},
          currentWorkflowId: null,
        });
      },

      // Get a specific session
      getSession: (workflowId) => {
        return get().sessions[workflowId];
      },

      // Set current workflow
      setCurrentWorkflow: (workflowId) => {
        set({ currentWorkflowId: workflowId });
      },
    }),
    {
      name: 'ai-optimization-store',
      // Persist sessions for up to 7 days
      partialize: (state) => ({
        sessions: Object.fromEntries(
          Object.entries(state.sessions).filter(
            ([_, session]) => Date.now() - session.lastUpdated < 7 * 24 * 60 * 60 * 1000
          )
        ),
      }),
    }
  )
);
