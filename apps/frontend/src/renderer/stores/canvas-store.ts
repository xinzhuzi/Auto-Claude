/**
 * Canvas Store
 *
 * Manages React Flow canvas state (nodes, edges, viewport, selection).
 * Follows Auto-Claude's Zustand store pattern.
 */

import { create } from 'zustand';
import type { CanvasNode, CanvasEdge, ViewportState } from '../../shared/types';

interface CanvasState {
  // Canvas elements
  nodes: CanvasNode[];
  edges: CanvasEdge[];

  // Viewport state
  viewport: ViewportState;

  // Selection state
  selectedNodes: Set<string>;
  selectedEdges: Set<string>;

  // UI state
  isDragging: boolean;
  isConnecting: boolean;
  showMiniMap: boolean;

  // Actions
  setNodes: (nodes: CanvasNode[]) => void;
  setEdges: (edges: CanvasEdge[]) => void;
  addNode: (node: CanvasNode) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: Partial<CanvasNode>) => void;
  connectNodes: (sourceId: string, targetId: string) => void;
  removeEdge: (edgeId: string) => void;

  // Viewport actions
  setViewport: (viewport: ViewportState) => void;
  fitView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // Selection actions
  selectNode: (nodeId: string) => void;
  selectMultipleNodes: (nodeIds: string[]) => void;
  selectEdge: (edgeId: string) => void;
  selectMultipleEdges: (edgeIds: string[]) => void;
  clearSelection: () => void;

  // UI actions
  setDragging: (dragging: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  toggleMiniMap: () => void;

  // Helpers
  canConnect: (sourceId: string, targetId: string) => boolean;
  getConnectedNodes: (nodeId: string) => { sources: string[]; targets: string[] };
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodes: new Set(),
  selectedEdges: new Set(),
  isDragging: false,
  isConnecting: false,
  showMiniMap: true,

  // Node actions
  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  addNode: (node) =>
    set((state) => ({ nodes: [...state.nodes, node] })),

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodes: new Set([...state.selectedNodes].filter((id) => id !== nodeId)),
    })),

  updateNode: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, ...data } : n
      ),
    })),

  connectNodes: (sourceId, targetId) => {
    const edgeId = `edge_${sourceId}_${targetId}_${Date.now()}`;
    set((state) => ({
      edges: [
        ...state.edges,
        {
          id: edgeId,
          source: sourceId,
          target: targetId,
        },
      ],
    }));
  },

  removeEdge: (edgeId) =>
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
      selectedEdges: new Set([...state.selectedEdges].filter((id) => id !== edgeId)),
    })),

  // Viewport actions
  setViewport: (viewport) => set({ viewport }),

  fitView: () => set({ viewport: { x: 0, y: 0, zoom: 1 } }),

  zoomIn: () =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: Math.min(state.viewport.zoom + 0.1, 2),
      },
    })),

  zoomOut: () =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: Math.max(state.viewport.zoom - 0.1, 0.5),
      },
    })),

  resetZoom: () =>
    set((state) => ({
      viewport: { ...state.viewport, zoom: 1 },
    })),

  // Selection actions
  selectNode: (nodeId) => set({ selectedNodes: new Set([nodeId]), selectedEdges: new Set() }),

  selectMultipleNodes: (nodeIds) =>
    set({ selectedNodes: new Set(nodeIds), selectedEdges: new Set() }),

  selectEdge: (edgeId) => set({ selectedEdges: new Set([edgeId]), selectedNodes: new Set() }),

  selectMultipleEdges: (edgeIds) =>
    set({ selectedEdges: new Set(edgeIds), selectedNodes: new Set() }),

  clearSelection: () => set({ selectedNodes: new Set(), selectedEdges: new Set() }),

  // UI actions
  setDragging: (isDragging) => set({ isDragging }),

  setConnecting: (isConnecting) => set({ isConnecting }),

  toggleMiniMap: () =>
    set((state) => ({ showMiniMap: !state.showMiniMap })),

  // Helpers
  canConnect: (sourceId, targetId) => {
    const state = get();
    // Check if edge already exists
    const edgeExists = state.edges.some(
      (e) => e.source === sourceId && e.target === targetId
    );
    // Prevent self-loops
    const isSelfLoop = sourceId === targetId;
    return !edgeExists && !isSelfLoop;
  },

  getConnectedNodes: (nodeId) => {
    const state = get();
    const sources = state.edges
      .filter((e) => e.target === nodeId)
      .map((e) => e.source);
    const targets = state.edges
      .filter((e) => e.source === nodeId)
      .map((e) => e.target);
    return { sources, targets };
  },
}));
