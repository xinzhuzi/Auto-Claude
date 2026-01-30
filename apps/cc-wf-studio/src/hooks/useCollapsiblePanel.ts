/**
 * 可折叠面板自定义 Hook
 *
 * 为侧边栏面板提供折叠/展开功能，支持 localStorage 持久化。
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'cc-wf-studio.nodePaletteCollapsed';
const DEFAULT_COLLAPSED = false;

interface UseCollapsiblePanelReturn {
  isCollapsed: boolean;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
}

/**
 * 可折叠面板功能的自定义 hook
 *
 * 功能:
 * - 切换折叠/展开状态
 * - localStorage 持久化
 *
 * @returns {UseCollapsiblePanelReturn} 折叠状态和控制函数
 */
export function useCollapsiblePanel(): UseCollapsiblePanelReturn {
  // 从 localStorage 初始化状态或使用默认值
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
    return DEFAULT_COLLAPSED;
  });

  // 切换折叠状态
  const toggle = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // 展开面板
  const expand = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  // 折叠面板
  const collapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  // 状态变化时持久化到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isCollapsed.toString());
  }, [isCollapsed]);

  return {
    isCollapsed,
    toggle,
    expand,
    collapse,
  };
}
