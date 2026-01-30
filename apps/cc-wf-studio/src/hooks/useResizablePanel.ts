/**
 * 可调整大小面板自定义 Hook
 *
 * 为侧边栏面板提供拖拽调整大小功能。
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_MIN_WIDTH = 200;
const DEFAULT_MAX_WIDTH = 600;
const DEFAULT_WIDTH = 300;
const DEFAULT_STORAGE_KEY = 'cc-wf-studio.sidebarWidth';

interface UseResizablePanelOptions {
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  storageKey?: string;
}

interface UseResizablePanelReturn {
  width: number;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

/**
 * 可调整大小面板功能的自定义 hook
 *
 * 功能:
 * - 通过鼠标事件拖拽调整大小
 * - 可配置的宽度约束
 * - localStorage 持久化
 * - 调整大小时的视觉反馈
 *
 * @param options - 可选配置：最小/最大宽度、默认宽度和存储键
 * @returns {UseResizablePanelReturn} 面板宽度、调整状态和鼠标按下处理器
 */
export function useResizablePanel(options?: UseResizablePanelOptions): UseResizablePanelReturn {
  const minWidth = options?.minWidth ?? DEFAULT_MIN_WIDTH;
  const maxWidth = options?.maxWidth ?? DEFAULT_MAX_WIDTH;
  const defaultWidth = options?.defaultWidth ?? DEFAULT_WIDTH;
  const storageKey = options?.storageKey ?? DEFAULT_STORAGE_KEY;

  // 从 localStorage 初始化宽度或使用默认值
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = Number.parseInt(saved, 10);
      if (!Number.isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
        return parsed;
      }
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // 处理调整大小时的鼠标移动
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const deltaX = startXRef.current - e.clientX;
      const newWidth = startWidthRef.current + deltaX;

      // 应用约束
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(constrainedWidth);
    },
    [minWidth, maxWidth]
  );

  // 处理鼠标抬起以结束调整
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // 处理鼠标按下以开始调整
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  // 设置全局鼠标事件监听器
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // 拖拽时阻止文本选择
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // 恢复正常光标和选择
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // 宽度变化时持久化到 localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, width.toString());
  }, [width, storageKey]);

  return {
    width,
    isResizing,
    handleMouseDown,
  };
}
