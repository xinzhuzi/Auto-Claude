import { create } from 'zustand';

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

const loadInitialState = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
};

interface SidebarState {
  isCollapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: loadInitialState(),

  toggle: () => set((state) => {
    const newState = !state.isCollapsed;
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState));
    } catch (error) {
      console.error('Failed to persist sidebar state:', error);
    }
    return { isCollapsed: newState };
  }),

  collapse: () => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
    } catch (error) {
      console.error('Failed to persist sidebar state:', error);
    }
    set({ isCollapsed: true });
  },

  expand: () => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'false');
    } catch (error) {
      console.error('Failed to persist sidebar state:', error);
    }
    set({ isCollapsed: false });
  },

  setCollapsed: (collapsed) => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch (error) {
      console.error('Failed to persist sidebar state:', error);
    }
    set({ isCollapsed: collapsed });
  },
}));
