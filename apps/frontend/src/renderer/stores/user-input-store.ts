/**
 * User Input Store
 * =================
 *
 * Manages user input requests from workflow execution.
 * Handles pending requests, responses, and cancellations.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserInputRequest {
  requestId: string;
  question: string;
  options: string[];
  multiSelect: boolean;
  timestamp: number;
}

export interface UserInputStore {
  // State
  pendingRequests: UserInputRequest[];
  currentRequest: UserInputRequest | null;

  // Actions
  addRequest: (request: UserInputRequest) => void;
  removeRequest: (requestId: string) => void;
  setCurrentRequest: (request: UserInputRequest | null) => void;
  clearAllRequests: () => void;
  getRequest: (requestId: string) => UserInputRequest | undefined;
}

export const useUserInputStore = create<UserInputStore>()(
  persist(
    (set, get) => ({
      // Initial state
      pendingRequests: [],
      currentRequest: null,

      // Add a new user input request
      addRequest: (request) => {
        set((state) => ({
          pendingRequests: [...state.pendingRequests, request],
          // Auto-set as current if no current request
          currentRequest: state.currentRequest || request
        }));
      },

      // Remove a request (after response or cancellation)
      removeRequest: (requestId) => {
        set((state) => {
          const newPendingRequests = state.pendingRequests.filter(
            (r) => r.requestId !== requestId
          );

          // If removing current request, set next pending as current
          const newCurrentRequest =
            state.currentRequest?.requestId === requestId
              ? newPendingRequests[0] || null
              : state.currentRequest;

          return {
            pendingRequests: newPendingRequests,
            currentRequest: newCurrentRequest
          };
        });
      },

      // Set the current request being displayed
      setCurrentRequest: (request) => {
        set({ currentRequest: request });
      },

      // Clear all pending requests
      clearAllRequests: () => {
        set({
          pendingRequests: [],
          currentRequest: null
        });
      },

      // Get a specific request by ID
      getRequest: (requestId) => {
        return get().pendingRequests.find((r) => r.requestId === requestId);
      }
    }),
    {
      name: 'user-input-store',
      // Don't persist pending requests (they're ephemeral)
      partialize: (state) => ({
        // Only persist if needed, for now we don't persist anything
      })
    }
  )
);
